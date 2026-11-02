# Habit Circle — PRD
## Problem statement
Simple community habit tracker for friends/colleagues: sign up/in (no email confirmation), My habits (private/shared), habit page with Last 7 days ticks, Days done, Current streak, Community page of shared habits, comments on shared habits.

## Architecture
FastAPI + MongoDB (users, habits with done_dates array, comments, login_attempts). JWT Bearer token (7 days) stored in localStorage. React + Tailwind, neo-brutalist earthy design.

## Implemented (2026-06)
- Sign up / Sign in / Sign out, redirect to My habits
- Top nav + sidebar navigation
- Add habit (name, when I do it, share checkbox unticked by default), Shared/Private label
- Habit page: 7 local-date checkboxes (owner only), Days done (all ticked days), Current streak (from most recent done day)
- Community: shared habits only, owner name, when text, days done
- Comments with author names on shared habits (owner + members)
- Private habits return 404 to non-owners; non-owner ticks return 403
- Tested: backend 18/18, frontend E2E all pass

## Backlog
- P2: Change sharing setting after creation, edit/delete habits/comments (not requested)
