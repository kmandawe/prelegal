"""Tests for signup/signin/session auth (PL-7). No LLM involved."""

from tests.conftest import auth, register


def test_signup_returns_token_and_user(client):
    res = client.post(
        "/api/auth/signup",
        json={"name": "Jane Doe", "email": "Jane@Acme.com", "password": "password123"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["token"]
    assert body["user"] == {"name": "Jane Doe", "email": "jane@acme.com"}


def test_signup_duplicate_email_conflicts(client):
    register(client, email="dup@acme.com")
    res = client.post(
        "/api/auth/signup",
        json={"name": "Other", "email": "dup@acme.com", "password": "password123"},
    )
    assert res.status_code == 409


def test_signup_rejects_short_password(client):
    res = client.post(
        "/api/auth/signup",
        json={"name": "Jane", "email": "jane@acme.com", "password": "short"},
    )
    assert res.status_code == 400


def test_signin_success(client):
    register(client, email="jane@acme.com")
    res = client.post(
        "/api/auth/signin",
        json={"email": "jane@acme.com", "password": "password123"},
    )
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "jane@acme.com"


def test_signin_wrong_password(client):
    register(client, email="jane@acme.com")
    res = client.post(
        "/api/auth/signin",
        json={"email": "jane@acme.com", "password": "wrongpass1"},
    )
    assert res.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=auth("garbage")).status_code == 401


def test_me_returns_current_user(client):
    token = register(client, email="jane@acme.com", name="Jane Doe")
    res = client.get("/api/auth/me", headers=auth(token))
    assert res.status_code == 200
    assert res.json() == {"name": "Jane Doe", "email": "jane@acme.com"}


def test_signout_invalidates_token(client):
    token = register(client)
    assert client.post("/api/auth/signout", headers=auth(token)).status_code == 200
    assert client.get("/api/auth/me", headers=auth(token)).status_code == 401
