"""Prelegal backend (PL-7).

Serves the statically-exported Next.js frontend and the API. Real authentication
(signup/signin with hashed passwords and bearer-token sessions) gates document
persistence: users can save the documents they create and revisit them later. The
SQLite database is recreated on every startup, so accounts and saved documents are
temporary by design.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app import db
from app.assistant import AssistantRequest, AssistantResult
from app.assistant import generate_reply as generate_assistant_reply
from app.chat import ChatRequest, ChatResult, generate_reply
from app.document_types import DOCUMENT_TYPES, DocumentType, get_document_type


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)


# --- Models -----------------------------------------------------------------


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class SigninRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    name: str
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class SaveDocumentRequest(BaseModel):
    documentType: str
    title: str
    fields: dict
    id: Optional[int] = None


class DocumentMeta(BaseModel):
    id: int
    doc_type: str
    title: str
    created_at: str
    updated_at: str


class DocumentDetail(DocumentMeta):
    fields: dict


# --- Auth dependency --------------------------------------------------------


def current_user(authorization: Annotated[Optional[str], Header()] = None) -> dict:
    """Resolve the signed-in user from the Authorization: Bearer header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.get_user_by_token(authorization.removeprefix("Bearer ").strip())
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


CurrentUser = Annotated[dict, Depends(current_user)]


# --- Health -----------------------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# --- Auth -------------------------------------------------------------------


@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest) -> AuthResponse:
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user = db.create_user(req.name.strip(), req.email, req.password)
    if user is None:
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    token = db.create_session(user["id"])
    return AuthResponse(token=token, user=UserOut(name=user["name"], email=user["email"]))


@app.post("/api/auth/signin", response_model=AuthResponse)
def signin(req: SigninRequest) -> AuthResponse:
    user = db.verify_user(req.email, req.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = db.create_session(user["id"])
    return AuthResponse(token=token, user=UserOut(name=user["name"], email=user["email"]))


@app.post("/api/auth/signout")
def signout(authorization: Annotated[Optional[str], Header()] = None) -> dict[str, bool]:
    if authorization and authorization.startswith("Bearer "):
        db.delete_session(authorization.removeprefix("Bearer ").strip())
    return {"ok": True}


@app.get("/api/auth/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut(name=user["name"], email=user["email"])


# --- Documents --------------------------------------------------------------


@app.post("/api/documents", response_model=DocumentDetail)
def save_document(req: SaveDocumentRequest, user: CurrentUser) -> DocumentDetail:
    if get_document_type(req.documentType) is None:
        raise HTTPException(status_code=400, detail="Unknown document type")
    saved = db.save_document(
        user_id=user["id"],
        doc_type=req.documentType,
        title=req.title.strip() or "Untitled document",
        fields=req.fields,
        doc_id=req.id,
    )
    if saved is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentDetail(**saved)


@app.get("/api/documents", response_model=list[DocumentMeta])
def list_documents(user: CurrentUser) -> list[DocumentMeta]:
    return [DocumentMeta(**doc) for doc in db.list_documents(user["id"])]


@app.get("/api/documents/{doc_id}", response_model=DocumentDetail)
def get_document_endpoint(doc_id: int, user: CurrentUser) -> DocumentDetail:
    doc = db.get_document(user["id"], doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentDetail(**doc)


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, user: CurrentUser) -> dict[str, bool]:
    if not db.delete_document(user["id"], doc_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


# --- Document catalog & AI chat (unchanged from PL-6) -----------------------


@app.get("/api/document-types", response_model=list[DocumentType])
def document_types() -> list[DocumentType]:
    """The catalog of supported documents and their cover-page fields (PL-6)."""
    return DOCUMENT_TYPES


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


@app.post("/api/assistant", response_model=AssistantResult)
def assistant(req: AssistantRequest) -> AssistantResult:
    """Generic chat that triages the document type and collects its fields (PL-6)."""
    if not os.environ.get("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not configured")
    try:
        return generate_assistant_reply(req)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="The AI service is currently unavailable"
        ) from exc


# Mount the static frontend last so the /api routes take precedence.
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST", "../frontend/out"))
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
