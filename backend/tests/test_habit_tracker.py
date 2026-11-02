# Habit tracker API regression tests: auth, habits, ticks/streak, community, comments, permissions
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def signup(name):
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    r = requests.post(f"{API}/auth/signup", json={"display_name": name, "email": email, "password": "test1234"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "user": d["user"], "h": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def u1():
    return signup("TEST_Owner")


@pytest.fixture(scope="module")
def u2():
    return signup("TEST_Other")


@pytest.fixture(scope="module")
def habits(u1):
    priv = requests.post(f"{API}/habits", json={"name": "TEST_private", "when": "morning"}, headers=u1["h"]).json()
    shr = requests.post(f"{API}/habits", json={"name": "TEST_shared", "when": "evening", "shared": True}, headers=u1["h"]).json()
    return priv, shr


# --- Auth
class TestAuth:
    def test_signup_returns_user(self, u1):
        assert u1["user"]["display_name"] == "TEST_Owner"
        assert isinstance(u1["user"]["id"], str)

    def test_signup_duplicate(self, u1):
        r = requests.post(f"{API}/auth/signup", json={"display_name": "x", "email": u1["email"], "password": "test1234"})
        assert r.status_code == 400

    def test_signin_ok(self, u1):
        r = requests.post(f"{API}/auth/signin", json={"email": u1["email"], "password": "test1234"})
        assert r.status_code == 200 and r.json()["user"]["email"] == u1["email"]

    def test_signin_alice(self):
        r = requests.post(f"{API}/auth/signin", json={"email": "alice@test.com", "password": "test1234"})
        assert r.status_code == 200

    def test_signin_wrong_password(self, u2):
        r = requests.post(f"{API}/auth/signin", json={"email": u2["email"], "password": "wrongpw"})
        assert r.status_code == 401
        assert r.json()["detail"] == "Incorrect email or password"

    def test_me(self, u1):
        r = requests.get(f"{API}/auth/me", headers=u1["h"])
        assert r.status_code == 200 and r.json()["display_name"] == "TEST_Owner"

    def test_unauth(self):
        assert requests.get(f"{API}/habits/mine").status_code == 401
        assert requests.get(f"{API}/habits/mine", headers={"Authorization": "Bearer junk"}).status_code == 401


# --- Habits
class TestHabits:
    def test_create_default_private(self, habits):
        priv, shr = habits
        assert priv["shared"] is False and priv["when"] == "morning" and priv["days_done"] == 0
        assert shr["shared"] is True

    def test_mine_only_own(self, u1, u2, habits):
        ids = [h["id"] for h in requests.get(f"{API}/habits/mine", headers=u1["h"]).json()]
        assert habits[0]["id"] in ids and habits[1]["id"] in ids
        assert requests.get(f"{API}/habits/mine", headers=u2["h"]).json() == []

    def test_empty_name(self, u1):
        r = requests.post(f"{API}/habits", json={"name": "  "}, headers=u1["h"])
        assert r.status_code == 400

    def test_community(self, u2, habits):
        data = requests.get(f"{API}/habits/community", headers=u2["h"]).json()
        ids = {h["id"]: h for h in data}
        assert habits[1]["id"] in ids and habits[0]["id"] not in ids
        assert all(h["shared"] for h in data)
        assert ids[habits[1]["id"]]["owner_name"] == "TEST_Owner"

    def test_private_404_for_other(self, u2, habits):
        assert requests.get(f"{API}/habits/{habits[0]['id']}", headers=u2["h"]).status_code == 404
        assert requests.get(f"{API}/habits/{habits[0]['id']}/comments", headers=u2["h"]).status_code == 404
        assert requests.post(f"{API}/habits/{habits[0]['id']}/comments", json={"text": "x"}, headers=u2["h"]).status_code == 404

    def test_invalid_id_404(self, u1):
        assert requests.get(f"{API}/habits/notanid", headers=u1["h"]).status_code == 404


# --- Ticks & streak
class TestTicks:
    def test_streak_logic(self, u1, habits):
        hid = habits[0]["id"]
        t = date.today()
        put = lambda d, done: requests.put(f"{API}/habits/{hid}/ticks", json={"date": d.isoformat(), "done": done}, headers=u1["h"])
        r = put(t, True); assert r.json()["current_streak"] == 1
        r = put(t - timedelta(1), True); assert r.json()["current_streak"] == 2 and r.json()["days_done"] == 2
        r = put(t - timedelta(3), True); assert r.json()["current_streak"] == 2 and r.json()["days_done"] == 3
        r = put(t, True); assert r.json()["days_done"] == 3  # idempotent
        r = put(t, False); assert r.json()["current_streak"] == 1 and r.json()["days_done"] == 2
        g = requests.get(f"{API}/habits/{hid}", headers=u1["h"]).json()
        assert sorted(g["done_dates"]) == sorted([(t - timedelta(1)).isoformat(), (t - timedelta(3)).isoformat()])

    def test_invalid_date(self, u1, habits):
        r = requests.put(f"{API}/habits/{habits[0]['id']}/ticks", json={"date": "2025-13-40", "done": True}, headers=u1["h"])
        assert r.status_code == 400

    def test_non_owner_403(self, u2, habits):
        r = requests.put(f"{API}/habits/{habits[1]['id']}/ticks", json={"date": date.today().isoformat(), "done": True}, headers=u2["h"])
        assert r.status_code == 403
        g = requests.get(f"{API}/habits/{habits[1]['id']}", headers=u2["h"]).json()
        assert g["is_owner"] is False and g["days_done"] == 0


# --- Comments
class TestComments:
    def test_comment_flow(self, u1, u2, habits):
        hid = habits[1]["id"]
        r = requests.post(f"{API}/habits/{hid}/comments", json={"text": "TEST nice"}, headers=u2["h"])
        assert r.status_code == 200
        c = r.json()
        assert c["author_name"] == "TEST_Other" and "_id" not in c and isinstance(c["id"], str)
        lst = requests.get(f"{API}/habits/{hid}/comments", headers=u1["h"]).json()
        assert any(x["id"] == c["id"] and x["text"] == "TEST nice" and x["author_name"] == "TEST_Other" for x in lst)

    def test_empty_comment(self, u2, habits):
        r = requests.post(f"{API}/habits/{habits[1]['id']}/comments", json={"text": " "}, headers=u2["h"])
        assert r.status_code == 400
