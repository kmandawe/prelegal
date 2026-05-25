# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation provides the V1 technical foundation (PL-4): a fake login screen and a Mutual NDA creator (PL-3) served from a FastAPI backend, now driven by a freeform AI chat (PL-5) that asks about the document and populates the cover-page fields. Support for all 11 document types and real authentication with document persistence are planned (PL-6 and PL-7) and not yet built.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### Completed (PL-3)
- Mutual NDA creator prototype (Next.js): cover-page form, live preview, and PDF download via @react-pdf/renderer

### Completed (PL-4) - V1 foundation
- FastAPI backend as a uv project in `backend/` (`app/main.py` routes, `app/db.py` SQLite access)
- SQLite database recreated from scratch on each startup (`users` table)
- Fake login screen (name + email, no authentication) gating the app; session kept in `localStorage` via `useSyncExternalStore`
- Next.js static export (`output: "export"`) served by FastAPI at localhost:8000
- Multi-stage Dockerfile (Node builds the static export, Python serves it via FastAPI/uv)
- Start/stop scripts for Mac, Linux, Windows that build and run the container
- Existing MNDA creator features unchanged

### Completed (PL-5) - AI chat
- `POST /api/chat` backend endpoint calling LiteLLM -> OpenRouter -> Cerebras `gpt-oss-120b` with Structured Outputs (`backend/app/chat.py`)
- Freeform chat UI (`frontend/src/components/mnda-chat.tsx`) that drives MNDA field collection; the assistant asks about the document and fills the cover-page fields
- Chat sits above the existing (still editable) form; extracted fields populate the form and live preview, only non-null values are applied so a field is never cleared
- Conversation and field state live in the browser; the backend is stateless (persistence is PL-7)
- Backend tests with the LLM mocked (`backend/tests/test_chat.py`)

### Planned (not yet implemented)
- PL-6: Support for all 11 document types from catalog.json
- PL-7: Real user authentication (signup/signin) and document persistence

### Current API Endpoints
- `POST /api/session` - Fake login; records the visitor (name, email) in SQLite, no authentication
- `POST /api/chat` - Freeform AI chat that returns the assistant's reply and the extracted MNDA fields (stateless; takes the conversation history and current fields)
- `GET /api/health` - Health check

### Running locally
Requires Docker. Build and run with `scripts/start-mac.sh` (or the Linux/Windows equivalents); the app is served at http://localhost:8000. Stop with `scripts/stop-*`. The container needs `OPENROUTER_API_KEY` in `.env` (the start scripts pass it via `--env-file`).

### Tests
Backend: `cd backend && uv run pytest` (the LLM is mocked, so no network or API key needed).