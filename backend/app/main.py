"""Prelegal V1 foundation backend.

Serves the statically-exported Next.js frontend and a minimal API. The login
is fake (PL-4): it records the visitor but performs no authentication.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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


# Mount the static frontend last so the /api routes take precedence.
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST", "../frontend/out"))
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
