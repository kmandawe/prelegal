"""SQLite access for the Prelegal foundation.

The database is recreated from scratch on every startup so each container
brings up a clean, temporary database (PL-4 requirement).
"""

import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("PRELEGAL_DB", "prelegal.db"))


def _connect() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    """Drop and recreate the schema so the database is fresh on each start."""
    conn = _connect()
    conn.execute("DROP TABLE IF EXISTS users")
    conn.execute(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    conn.commit()
    conn.close()


def upsert_user(name: str, email: str) -> None:
    """Record the visitor from the fake login. No authentication is performed."""
    conn = _connect()
    conn.execute(
        """
        INSERT INTO users (name, email) VALUES (?, ?)
        ON CONFLICT(email) DO UPDATE SET name = excluded.name
        """,
        (name, email),
    )
    conn.commit()
    conn.close()
