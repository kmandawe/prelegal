# prelegal
A platform for drafting common legal agreements

## Status
🚧 **In progress** — this project is currently under active development and is expected to be completed by **2026-05-26** (approximately 1 week from 2026-05-19).

## Running locally

Requires Docker. The app is served at http://localhost:8000.

```bash
# Mac
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows (PowerShell)
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

The container builds the Next.js frontend (static export) and serves it from a
FastAPI backend. A fresh SQLite database is created on each start.

## Layout

- `frontend/` — Next.js app (static export)
- `backend/` — FastAPI app (uv project) that serves the frontend and the API
- `scripts/` — start/stop helpers
- `templates/` — Common Paper legal templates
