"""Tests for document persistence (PL-7). No LLM involved."""

from tests.conftest import auth, register

SAMPLE = {
    "documentType": "csa",
    "title": "Acme and Globex - CSA",
    "fields": {"providerCompany": "Acme, Inc.", "customerCompany": "Globex"},
}


def test_save_requires_auth(client):
    assert client.post("/api/documents", json=SAMPLE).status_code == 401


def test_save_then_list_and_get(client):
    token = register(client)
    saved = client.post("/api/documents", json=SAMPLE, headers=auth(token)).json()
    assert saved["id"]
    assert saved["doc_type"] == "csa"
    assert saved["fields"]["providerCompany"] == "Acme, Inc."

    listing = client.get("/api/documents", headers=auth(token)).json()
    assert [d["id"] for d in listing] == [saved["id"]]
    assert listing[0]["title"] == "Acme and Globex - CSA"

    detail = client.get(f"/api/documents/{saved['id']}", headers=auth(token)).json()
    assert detail["fields"]["customerCompany"] == "Globex"


def test_save_unknown_type_rejected(client):
    token = register(client)
    res = client.post(
        "/api/documents",
        json={"documentType": "nonsense", "title": "x", "fields": {}},
        headers=auth(token),
    )
    assert res.status_code == 400


def test_update_existing_document(client):
    token = register(client)
    saved = client.post("/api/documents", json=SAMPLE, headers=auth(token)).json()

    update = {**SAMPLE, "id": saved["id"], "title": "Renamed", "fields": {"providerCompany": "New Co."}}
    updated = client.post("/api/documents", json=update, headers=auth(token)).json()
    assert updated["id"] == saved["id"]
    assert updated["title"] == "Renamed"
    assert updated["fields"]["providerCompany"] == "New Co."

    listing = client.get("/api/documents", headers=auth(token)).json()
    assert len(listing) == 1  # updated in place, not duplicated


def test_documents_are_scoped_per_user(client):
    token_a = register(client, email="a@acme.com")
    token_b = register(client, email="b@acme.com")
    saved = client.post("/api/documents", json=SAMPLE, headers=auth(token_a)).json()

    assert client.get("/api/documents", headers=auth(token_b)).json() == []
    assert client.get(f"/api/documents/{saved['id']}", headers=auth(token_b)).status_code == 404
    # User B cannot update user A's document either.
    res = client.post(
        "/api/documents",
        json={**SAMPLE, "id": saved["id"]},
        headers=auth(token_b),
    )
    assert res.status_code == 404


def test_delete_document(client):
    token = register(client)
    saved = client.post("/api/documents", json=SAMPLE, headers=auth(token)).json()
    assert client.delete(f"/api/documents/{saved['id']}", headers=auth(token)).status_code == 200
    assert client.get("/api/documents", headers=auth(token)).json() == []
    assert client.delete(f"/api/documents/{saved['id']}", headers=auth(token)).status_code == 404
