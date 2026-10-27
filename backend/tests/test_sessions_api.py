import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.settings import settings
from app.main import app
from app.models import GameSession
from tests.helpers import valid


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


PIN = {"X-Dashboard-Pin": settings.dashboard_pin}


def test_server_recalculates_total_and_classification(client):
    r = client.post("/api/sessions", json=valid(total_literacy_score=9, internal_zone_classification="GREEN"))
    assert r.status_code == 201
    assert r.json()["total_literacy_score"] == 5 and r.json()["internal_zone_classification"] == "YELLOW"


def test_post_is_idempotent_by_session_id(client, db):
    assert client.post("/api/sessions", json=valid()).status_code == 201
    assert client.post("/api/sessions", json=valid(c4_cybersecurity_score=3)).status_code == 200
    assert db.query(GameSession).count() == 1
    assert db.get(GameSession, "SES-TEST-1").total_literacy_score == 6


@pytest.mark.parametrize("changes", [
    {"age_range": "ABC"}, {"zone_code": "Z099"}, {"kiosk_id": "XYZ"}, {"c4_cybersecurity_score": 9},
    {"session_id": "mal id!"}, {"iot_trigger_type": "LASER"},
])
def test_invalid_payload_is_422(client, changes):
    assert client.post("/api/sessions", json=valid(**changes)).status_code == 422


def test_unknown_but_well_formed_kiosk_is_422_not_500(client):
    assert client.post("/api/sessions", json=valid(kiosk_id="PTYK099")).status_code == 422


def test_extra_personal_fields_are_ignored(client, db):
    r = client.post("/api/sessions", json=valid(full_name="Marta Pérez", cedula="8-000-0000"))
    assert r.status_code == 201 and "full_name" not in r.json() and "cedula" not in r.json()


def test_listing_and_metrics_require_pin(client):
    client.post("/api/sessions", json=valid())
    assert client.get("/api/sessions").status_code == 401
    assert client.get("/api/sessions", headers={"X-Dashboard-Pin": "0000"}).status_code == 401
    ok = client.get("/api/sessions", headers=PIN)
    assert ok.status_code == 200 and len(ok.json()) == 1
    m = client.get("/api/metrics", headers=PIN).json()
    assert m["total_sessions"] == 1 and m["tiers"]["YELLOW"] == 1


def test_reference_endpoints_are_public(client):
    assert len(client.get("/api/zones").json()) == 36
    assert {k["code"] for k in client.get("/api/kiosks").json()} >= {"PTYK001", "DIRECT_WEB"}
