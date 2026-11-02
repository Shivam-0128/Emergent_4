from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Annotated, List, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)

    def to_mongo(self):
        data = self.model_dump(by_alias=True, exclude={"id"})
        return data


class User(BaseDocument):
    display_name: str
    email: str
    password_hash: str
    created_at: str


class Habit(BaseDocument):
    owner_id: PyObjectId
    owner_name: str
    name: str
    when: str
    shared: bool
    done_dates: List[str] = []
    created_at: str


class Comment(BaseDocument):
    habit_id: PyObjectId
    author_id: PyObjectId
    author_name: str
    text: str
    created_at: str


# ---------- Auth helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def current_user(request: Request) -> User:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(auth[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid or expired session")
    doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not doc:
        raise HTTPException(401, "User not found")
    return User.from_mongo(doc)


def public_user(u: User):
    return {"id": u.id, "display_name": u.display_name, "email": u.email}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth routes ----------
class SignUpIn(BaseModel):
    display_name: str
    email: str
    password: str


class SignInIn(BaseModel):
    email: str
    password: str


@api.post("/auth/signup")
async def signup(body: SignUpIn):
    name, email = body.display_name.strip(), body.email.strip().lower()
    if not name or not email or "@" not in email:
        raise HTTPException(400, "Please enter a display name and a valid email")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    user = User(display_name=name, email=email, password_hash=hash_password(body.password), created_at=now_iso())
    res = await db.users.insert_one(user.to_mongo())
    user.id = str(res.inserted_id)
    return {"token": create_token(user.id), "user": public_user(user)}


@api.post("/auth/signin")
async def signin(body: SignInIn, request: Request):
    email = body.email.strip().lower()
    ident = f"{request.client.host if request.client else ''}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= 5 and attempt["last"] > datetime.now(timezone.utc) - timedelta(minutes=15):
        raise HTTPException(429, "Too many attempts. Please try again in 15 minutes")
    doc = await db.users.find_one({"email": email})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident}, {"$inc": {"count": 1}, "$set": {"last": datetime.now(timezone.utc)}}, upsert=True
        )
        raise HTTPException(401, "Incorrect email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    user = User.from_mongo(doc)
    return {"token": create_token(user.id), "user": public_user(user)}


@api.get("/auth/me")
async def me(user: User = Depends(current_user)):
    return public_user(user)


# ---------- Habits ----------
def streak(dates: List[str]) -> int:
    if not dates:
        return 0
    days = sorted({date.fromisoformat(d) for d in dates}, reverse=True)
    count, prev = 1, days[0]
    for d in days[1:]:
        if prev - d == timedelta(days=1):
            count += 1
            prev = d
        else:
            break
    return count


def habit_out(h: Habit, user: User):
    return {
        "id": h.id, "name": h.name, "when": h.when, "shared": h.shared,
        "owner_id": h.owner_id, "owner_name": h.owner_name,
        "is_owner": h.owner_id == user.id,
        "done_dates": sorted(h.done_dates),
        "days_done": len(set(h.done_dates)),
        "current_streak": streak(h.done_dates),
        "created_at": h.created_at,
    }


async def get_visible_habit(habit_id: str, user: User) -> Habit:
    if not ObjectId.is_valid(habit_id):
        raise HTTPException(404, "Habit not found")
    doc = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not doc:
        raise HTTPException(404, "Habit not found")
    h = Habit.from_mongo(doc)
    if h.owner_id != user.id and not h.shared:
        raise HTTPException(404, "Habit not found")
    return h


class HabitIn(BaseModel):
    name: str
    when: str = ""
    shared: bool = False


@api.post("/habits")
async def create_habit(body: HabitIn, user: User = Depends(current_user)):
    if not body.name.strip():
        raise HTTPException(400, "Please enter a habit name")
    h = Habit(owner_id=user.id, owner_name=user.display_name, name=body.name.strip(),
              when=body.when.strip(), shared=body.shared, created_at=now_iso())
    res = await db.habits.insert_one({**h.to_mongo(), "owner_id": ObjectId(user.id)})
    h.id = str(res.inserted_id)
    return habit_out(h, user)


@api.get("/habits/mine")
async def my_habits(user: User = Depends(current_user)):
    docs = await db.habits.find({"owner_id": ObjectId(user.id)}).sort("created_at", -1).to_list(1000)
    return [habit_out(Habit.from_mongo(d), user) for d in docs]


@api.get("/habits/community")
async def community(user: User = Depends(current_user)):
    docs = await db.habits.find({"shared": True}).sort("created_at", -1).to_list(1000)
    return [habit_out(Habit.from_mongo(d), user) for d in docs]


@api.get("/habits/{habit_id}")
async def get_habit(habit_id: str, user: User = Depends(current_user)):
    return habit_out(await get_visible_habit(habit_id, user), user)


class TickIn(BaseModel):
    date: str
    done: bool


@api.put("/habits/{habit_id}/ticks")
async def set_tick(habit_id: str, body: TickIn, user: User = Depends(current_user)):
    h = await get_visible_habit(habit_id, user)
    if h.owner_id != user.id:
        raise HTTPException(403, "Only the owner can change this habit")
    if not DATE_RE.match(body.date):
        raise HTTPException(400, "Invalid date")
    try:
        date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Invalid date")
    op = "$addToSet" if body.done else "$pull"
    await db.habits.update_one({"_id": ObjectId(habit_id)}, {op: {"done_dates": body.date}})
    doc = await db.habits.find_one({"_id": ObjectId(habit_id)})
    return habit_out(Habit.from_mongo(doc), user)


# ---------- Comments ----------
class CommentIn(BaseModel):
    text: str


@api.get("/habits/{habit_id}/comments")
async def list_comments(habit_id: str, user: User = Depends(current_user)):
    await get_visible_habit(habit_id, user)
    docs = await db.comments.find({"habit_id": ObjectId(habit_id)}).sort("created_at", 1).to_list(1000)
    return [Comment.from_mongo(d).model_dump() for d in docs]


@api.post("/habits/{habit_id}/comments")
async def post_comment(habit_id: str, body: CommentIn, user: User = Depends(current_user)):
    await get_visible_habit(habit_id, user)
    if not body.text.strip():
        raise HTTPException(400, "Please write a comment")
    c = Comment(habit_id=habit_id, author_id=user.id, author_name=user.display_name,
                text=body.text.strip(), created_at=now_iso())
    res = await db.comments.insert_one({**c.to_mongo(), "habit_id": ObjectId(habit_id), "author_id": ObjectId(user.id)})
    c.id = str(res.inserted_id)
    return c.model_dump()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=os.environ['CORS_ORIGINS'].split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.habits.create_index("owner_id")
    await db.habits.create_index("shared")
    await db.comments.create_index("habit_id")
    await db.login_attempts.create_index("identifier")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
