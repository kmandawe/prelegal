"""Tests for the PL-6 generic assistant and document catalog. LLM is mocked."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _fake_completion(result: dict):
    content = json.dumps(result)
    message = SimpleNamespace(content=content)
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


@pytest.fixture
def api_key(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")


def test_document_types_catalog():
    res = client.get("/api/document-types")
    assert res.status_code == 200
    docs = res.json()
    ids = [d["id"] for d in docs]
    assert ids[0] == "mnda"  # bespoke type listed first
    assert len(ids) == 11
    assert "csa" in ids and "baa" in ids

    csa = next(d for d in docs if d["id"] == "csa")
    assert csa["engine"] == "generic"
    keys = [f["key"] for f in csa["fields"]]
    assert "subscriptionPeriod" in keys
    assert "providerCompany" in keys


def test_triage_classifies_document(monkeypatch, api_key):
    """With no type chosen yet, the assistant can pick a supported type."""
    result = {
        "reply": "Sounds like a Cloud Service Agreement. Let's set that up.",
        "documentType": "csa",
        "fields": [],
    }
    monkeypatch.setattr("app.assistant.completion", lambda **_: _fake_completion(result))

    res = client.post(
        "/api/assistant",
        json={
            "messages": [{"role": "user", "content": "I sell SaaS to businesses."}],
            "documentType": None,
            "fields": {},
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["documentType"] == "csa"
    assert body["fields"] == []


def test_triage_prompt_lists_catalog(monkeypatch, api_key):
    """The triage system prompt exposes the supported documents to the model."""
    captured = {}

    def capture(**kwargs):
        captured["messages"] = kwargs["messages"]
        return _fake_completion({"reply": "ok", "documentType": None, "fields": []})

    monkeypatch.setattr("app.assistant.completion", capture)

    res = client.post(
        "/api/assistant",
        json={
            "messages": [{"role": "user", "content": "I need a will."}],
            "documentType": None,
            "fields": {},
        },
    )

    assert res.status_code == 200
    system_prompt = captured["messages"][0]["content"]
    assert "csa" in system_prompt
    assert "pilot-agreement" in system_prompt
    # The triage prompt instructs the model on handling unsupported requests.
    assert "cannot generate" in system_prompt


def test_unsupported_request_keeps_type_unset(monkeypatch, api_key):
    """An unsupported ask returns a closest-match offer and no chosen type."""
    result = {
        "reply": (
            "We can't generate an employment contract, but the closest we offer is "
            "a Professional Services Agreement. Want to use that?"
        ),
        "documentType": None,
        "fields": [],
    }
    monkeypatch.setattr("app.assistant.completion", lambda **_: _fake_completion(result))

    res = client.post(
        "/api/assistant",
        json={
            "messages": [{"role": "user", "content": "I need an employment contract."}],
            "documentType": None,
            "fields": {},
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["documentType"] is None
    assert "Professional Services Agreement" in body["reply"]


def test_field_extraction_for_selected_type(monkeypatch, api_key):
    """Once a type is chosen, the assistant extracts that type's fields."""
    result = {
        "reply": "Got it. What's the subscription period?",
        "documentType": "csa",
        "fields": [
            {"key": "providerCompany", "value": "Acme, Inc."},
            {"key": "subscriptionPeriod", "value": None},
        ],
    }
    monkeypatch.setattr("app.assistant.completion", lambda **_: _fake_completion(result))

    res = client.post(
        "/api/assistant",
        json={
            "messages": [{"role": "user", "content": "Provider is Acme, Inc."}],
            "documentType": "csa",
            "fields": {},
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["documentType"] == "csa"
    by_key = {f["key"]: f["value"] for f in body["fields"]}
    assert by_key["providerCompany"] == "Acme, Inc."
    assert by_key["subscriptionPeriod"] is None


def test_collection_prompt_includes_fields_and_state(monkeypatch, api_key):
    """The collection prompt lists the type's fields and the current values."""
    captured = {}

    def capture(**kwargs):
        captured["messages"] = kwargs["messages"]
        return _fake_completion({"reply": "ok", "documentType": "csa", "fields": []})

    monkeypatch.setattr("app.assistant.completion", capture)

    res = client.post(
        "/api/assistant",
        json={
            "messages": [{"role": "user", "content": "continue"}],
            "documentType": "csa",
            "fields": {"governingLaw": "Delaware"},
        },
    )

    assert res.status_code == 200
    system_prompt = captured["messages"][0]["content"]
    assert "subscriptionPeriod" in system_prompt  # field keys are listed
    assert "Delaware" in system_prompt  # current state is forwarded


def test_missing_api_key_returns_500(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    res = client.post(
        "/api/assistant",
        json={"messages": [{"role": "user", "content": "Hi"}], "documentType": None, "fields": {}},
    )

    assert res.status_code == 500
    assert "OPENROUTER_API_KEY" in res.json()["detail"]


def test_llm_failure_returns_502(monkeypatch, api_key):
    def boom(**_):
        raise RuntimeError("provider down")

    monkeypatch.setattr("app.assistant.completion", boom)

    res = client.post(
        "/api/assistant",
        json={"messages": [{"role": "user", "content": "Hi"}], "documentType": None, "fields": {}},
    )

    assert res.status_code == 502
