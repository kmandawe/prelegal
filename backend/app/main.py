"""Prelegal V1 foundation backend.

Serves the statically-exported Next.js frontend and a minimal API. The login
is fake (PL-4): it records the visitor but performs no authentication.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.chat import ChatRequest, ChatResult, generate_reply
from app.db import init_db, upsert_user


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)


class SessionRequest(BaseModel):
    name: str
    email: str


class SessionResponse(BaseModel):
    ok: bool
    name: str
    email: str


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/session", response_model=SessionResponse)
def create_session(req: SessionRequest) -> SessionResponse:
    upsert_user(req.name, req.email)
    return SessionResponse(ok=True, name=req.name, email=req.email)


@app.post("/api/chat", response_model=ChatResult)
def chat(req: ChatRequest) -> ChatResult:
    """Drive Mutual NDA creation through a freeform AI chat (PL-5)."""
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not configured")
    try:
        return generate_reply(req.messages, req.fields)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="The AI service is currently unavailable"
        ) from exc


# Mount the static frontend last so the /api routes take precedence.
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST", "../frontend/out"))
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
