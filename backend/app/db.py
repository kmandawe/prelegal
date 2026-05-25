"""SQLite access for Prelegal (PL-7).

The database is recreated from scratch on every startup so each container brings
up a clean, temporary database. It holds registered users, their bearer-token
sessions, and the documents they have saved. Because the schema is dropped on
restart, sessions and saved documents do not survive a restart - which the PL-7
ticket explicitly allows.
"""

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(os.environ.get("PRELEGAL_DB", "prelegal.db"))

_PBKDF2_ROUNDS = 200_000


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Drop and recreate the schema so the database is fresh on each start."""
    conn = _connect()
    conn.executescript(
        """
        DROP TABLE IF EXISTS documents;
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS users;

        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            doc_type TEXT NOT NULL,
            title TEXT NOT NULL,
            fields TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        """
    )
    conn.commit()
    conn.close()


# --- Password hashing (stdlib, no extra dependencies) -----------------------


def _hash_password(password: str) -> str:
    """Return a 'salt$hash' string using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ROUNDS)
    return f"{salt.hex()}${digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    salt_hex, _, digest_hex = stored.partition("$")
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt_hex), _PBKDF2_ROUNDS
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


# --- Users ------------------------------------------------------------------


def create_user(name: str, email: str, password: str) -> Optional[dict]:
    """Create a user. Returns the user, or None if the email is already taken."""
    conn = _connect()
    try:
        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email.lower(), _hash_password(password)),
        )
        conn.commit()
        return {"id": cur.lastrowid, "name": name, "email": email.lower()}
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


def verify_user(email: str, password: str) -> Optional[dict]:
    """Return the user if the email/password match, otherwise None."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (email.lower(),),
        ).fetchone()
    finally:
        conn.close()
    if row is None or not _verify_password(password, row["password_hash"]):
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


# --- Sessions ---------------------------------------------------------------


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id)
        )
        conn.commit()
    finally:
        conn.close()
    return token


def get_user_by_token(token: str) -> Optional[dict]:
    conn = _connect()
    try:
        row = conn.execute(
            """
            SELECT users.id, users.name, users.email
            FROM sessions JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()
    finally:
        conn.close()
    return dict(row) if row else None


def delete_session(token: str) -> None:
    conn = _connect()
    try:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
    finally:
        conn.close()


# --- Documents --------------------------------------------------------------


def save_document(
    user_id: int,
    doc_type: str,
    title: str,
    fields: dict,
    doc_id: Optional[int] = None,
) -> Optional[dict]:
    """Insert a new document, or update an existing one owned by the user.

    Returns the saved document's metadata, or None if doc_id was given but does
    not belong to the user.
    """
    payload = json.dumps(fields)
    conn = _connect()
    try:
        if doc_id is not None:
            cur = conn.execute(
                """
                UPDATE documents
                SET doc_type = ?, title = ?, fields = ?, updated_at = datetime('now')
                WHERE id = ? AND user_id = ?
                """,
                (doc_type, title, payload, doc_id, user_id),
            )
            if cur.rowcount == 0:
                return None
            saved_id = doc_id
        else:
            cur = conn.execute(
                "INSERT INTO documents (user_id, doc_type, title, fields) VALUES (?, ?, ?, ?)",
                (user_id, doc_type, title, payload),
            )
            saved_id = cur.lastrowid
        conn.commit()
        return get_document(user_id, saved_id)
    finally:
        conn.close()


def list_documents(user_id: int) -> list[dict]:
    """Return the user's documents (metadata only, newest first)."""
    conn = _connect()
    try:
        rows = conn.execute(
            """
            SELECT id, doc_type, title, created_at, updated_at
            FROM documents WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
    finally:
        conn.close()
    return [dict(row) for row in rows]


def get_document(user_id: int, doc_id: int) -> Optional[dict]:
    """Return a single document with its fields, scoped to the owner."""
    conn = _connect()
    try:
        row = conn.execute(
            """
            SELECT id, doc_type, title, fields, created_at, updated_at
            FROM documents WHERE id = ? AND user_id = ?
            """,
            (doc_id, user_id),
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return None
    doc = dict(row)
    doc["fields"] = json.loads(doc["fields"])
    return doc


def delete_document(user_id: int, doc_id: int) -> bool:
    conn = _connect()
    try:
        cur = conn.execute(
            "DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id)
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
