"""Shared test fixtures.

Each test gets a fresh, isolated SQLite database in a temp directory so auth and
document persistence can be exercised without touching the real database file.
"""

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()
    return TestClient(app)


def register(client: TestClient, email: str = "jane@acme.com", name: str = "Jane Doe") -> str:
    """Sign a new user up and return their bearer token."""
    res = client.post(
        "/api/auth/signup",
        json={"name": name, "email": email, "password": "password123"},
    )
    assert res.status_code == 200, res.text
    return res.json()["token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
