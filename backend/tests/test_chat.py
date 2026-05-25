"""Tests for the /api/chat endpoint. The LLM call is always mocked."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _fake_completion(result: dict):
    """Build a fake litellm response carrying `result` as JSON content."""
    content = json.dumps(result)
    message = SimpleNamespace(content=content)
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


EMPTY_PARTY = {"printName": None, "title": None, "company": None, "noticeAddress": None}


@pytest.fixture
def api_key(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")


def test_extracts_fields_happy_path(monkeypatch, api_key):
    result = {
        "reply": "Got it. Who is the second party?",
        "fields": {
            "purpose": "Evaluating a partnership.",
            "effectiveDate": "2026-06-01",
            "mndaTermKind": "years",
            "mndaTermYears": 2,
            "termOfConfidentialityKind": "perpetuity",
            "termOfConfidentialityYears": None,
            "governingLawState": "Delaware",
            "jurisdiction": "New Castle, DE",
            "modifications": "None",
            "party1": {
                "printName": "Jane Doe",
                "title": "CEO",
                "company": "Acme, Inc.",
                "noticeAddress": "legal@acme.com",
            },
            "party2": EMPTY_PARTY,
        },
    }
    monkeypatch.setattr("app.chat.completion", lambda **_: _fake_completion(result))

    res = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "I need an NDA with Acme."}],
            "fields": {},
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["reply"] == "Got it. Who is the second party?"
    assert body["fields"]["party1"]["company"] == "Acme, Inc."
    assert body["fields"]["mndaTermYears"] == 2


def test_unknown_fields_returned_as_null(monkeypatch, api_key):
    """Fields the model has not learned yet come back as null for the frontend to skip."""
    result = {
        "reply": "What's the purpose of this NDA?",
        "fields": {
            "purpose": None,
            "effectiveDate": None,
            "mndaTermKind": None,
            "mndaTermYears": None,
            "termOfConfidentialityKind": None,
            "termOfConfidentialityYears": None,
            "governingLawState": None,
            "jurisdiction": None,
            "modifications": None,
            "party1": EMPTY_PARTY,
            "party2": EMPTY_PARTY,
        },
    }
    monkeypatch.setattr("app.chat.completion", lambda **_: _fake_completion(result))

    res = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}], "fields": {}},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["fields"]["purpose"] is None
    assert body["fields"]["party1"]["printName"] is None


def test_current_fields_passed_to_model(monkeypatch, api_key):
    """The user's current field state is forwarded into the prompt context."""
    captured = {}

    def capture(**kwargs):
        captured["messages"] = kwargs["messages"]
        return _fake_completion(
            {
                "reply": "ok",
                "fields": {
                    "purpose": "Evaluating a partnership.",
                    "effectiveDate": None,
                    "mndaTermKind": None,
                    "mndaTermYears": None,
                    "termOfConfidentialityKind": None,
                    "termOfConfidentialityYears": None,
                    "governingLawState": None,
                    "jurisdiction": None,
                    "modifications": None,
                    "party1": EMPTY_PARTY,
                    "party2": EMPTY_PARTY,
                },
            }
        )

    monkeypatch.setattr("app.chat.completion", capture)

    res = client.post(
        "/api/chat",
        json={
            "messages": [{"role": "user", "content": "continue"}],
            "fields": {"governingLawState": "Delaware"},
        },
    )

    assert res.status_code == 200
    system_prompt = captured["messages"][0]["content"]
    assert "Delaware" in system_prompt


def test_missing_api_key_returns_500(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    res = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}], "fields": {}},
    )

    assert res.status_code == 500
    assert "OPENROUTER_API_KEY" in res.json()["detail"]


def test_llm_failure_returns_502(monkeypatch, api_key):
    def boom(**_):
        raise RuntimeError("provider down")

    monkeypatch.setattr("app.chat.completion", boom)

    res = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}], "fields": {}},
    )

    assert res.status_code == 502
