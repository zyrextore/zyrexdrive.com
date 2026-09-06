# ZYREX DRIVE — PHASE 61–70

## Online-ready architecture
Phase 61–70 adds an optional server-backed account layer while preserving LOCAL SAVE.

### Account API
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`
- 7-day signed bearer token
- Passwords hashed with Node `crypto.scryptSync`
- Basic per-IP authentication attempt throttle

### Cloud profile
- GET `/api/profile`
- PUT `/api/profile`
- Server stores a sanitized JSON profile with a 200 KB limit.
- Client still keeps the local profile for offline play.

### Leaderboard
- GET `/api/leaderboard?mode=race`
- POST `/api/leaderboard`
- Race winner time is submitted only when logged in.
- Server keeps the best current entry per username/mode and returns top 50.

### Storage
No new database dependency was introduced. JSON files live under `data/`:
- `users.json`
- `profiles.json`
- `leaderboard.json`

This is suitable for development/small deployments. For production scale, move these records to a real database before adding many concurrent users.

## Client UI
Main Menu → ONLINE opens:
- Register / Login
- Cloud Save sync/load
- Race leaderboard
- Logout

LOCAL SAVE remains available without an account.
