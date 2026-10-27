import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.settings import settings
from app.main import app
from app.models import DailyCounter, Visit

PIN = {"X-Dashboard-Pin": settings.dashboard_pin}
VID = "V-test-0001"


def body(**over):
    return {"kiosk_id": "PTYK001", "origin": "KIOSK", "assisted_mode": False, "outcome": "ENTERED", **over}


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------- modelo y restricciones ----------
def test_visit_defaults_and_relationship(db):
    db.add(Visit(visit_id=VID, kiosk_id="PTYK001"))
    db.commit()
    v = db.get(Visit, VID)
    assert (v.origin, v.outcome, v.assisted_mode, v.session_id) == ("UNKNOWN", "ENTERED", False, None)
    assert v.first_seen_at is not None and v.kiosk.code == "PTYK001"
    assert v in db.get(type(v.kiosk), "PTYK001").visits


@pytest.mark.parametrize("changes,constraint", [
    ({"origin": "MOCK"}, "ck_visit_origin"),
    ({"outcome": "DECLINED_PRIVACY"}, "ck_visit_outcome"),  # el rechazo NUNCA deja fila por persona
    ({"outcome": "UNDER_18"}, "ck_visit_outcome"),
    ({"outcome": "VISTO"}, "ck_visit_outcome"),
])
def test_visit_constraints(db, changes, constraint):
    db.add(Visit(visit_id=VID, kiosk_id="PTYK001", **changes))
    with pytest.raises(IntegrityError) as exc:
        db.commit()
    db.rollback()
    assert constraint in str(exc.value)


def test_visit_unknown_kiosk_rejected(db):
    db.add(Visit(visit_id=VID, kiosk_id="PTYK099"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_counter_constraints(db):
    from datetime import date
    db.add(DailyCounter(day=date.today(), kiosk_id="PTYK001", outcome="COMPLETED", entries=1))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    db.add(DailyCounter(day=date.today(), kiosk_id="PTYK001", outcome="UNDER_18", entries=-1))
    with pytest.raises(IntegrityError):
        db.commit()


# ---------- API ----------
def test_enter_then_complete_updates_the_same_row(client, db):
    assert client.put(f"/api/visits/{VID}", json=body()).status_code == 201
    r = client.put(f"/api/visits/{VID}", json=body(outcome="COMPLETED", session_id="SES-TEST-1"))
    assert r.status_code == 200 and r.json()["outcome"] == "COMPLETED" and r.json()["session_id"] == "SES-TEST-1"
    assert db.query(Visit).count() == 1


def test_late_retry_cannot_downgrade_the_outcome(client, db):
    client.put(f"/api/visits/{VID}", json=body(outcome="COMPLETED", session_id="SES-TEST-1"))
    client.put(f"/api/visits/{VID}", json=body(outcome="ENTERED"))
    assert db.get(Visit, VID).outcome == "COMPLETED"


@pytest.mark.parametrize("outcome", ["DECLINED_PRIVACY", "UNDER_18"])
def test_opt_outs_leave_no_row_only_a_counter(client, db, outcome):
    client.put(f"/api/visits/{VID}", json=body())  # había entrado al inicio
    r = client.put(f"/api/visits/{VID}", json=body(outcome=outcome))
    assert r.status_code == 200 and r.json()["recorded"] == "counter"
    assert db.query(Visit).count() == 0  # se borró la fila individual
    assert db.query(DailyCounter).one().entries == 1


@pytest.mark.parametrize("path,changes", [
    ("/api/visits/corto", {}),  # visit_id demasiado corto
    (f"/api/visits/{VID}", {"kiosk_id": "XYZ"}),
    (f"/api/visits/{VID}", {"kiosk_id": "PTYK099"}),  # bien formado pero inexistente
    (f"/api/visits/{VID}", {"outcome": "HACK"}),
])
def test_invalid_visits_are_422(client, path, changes):
    assert client.put(path, json=body(**changes)).status_code == 422


def test_personal_fields_are_ignored(client, db):
    r = client.put(f"/api/visits/{VID}", json=body(full_name="Marta", cedula="8-1-1", ip="10.0.0.1"))
    assert r.status_code == 201
    assert not {"full_name", "cedula", "ip"} & set(r.json())


def test_summary_counts_everyone_who_entered(client):
    client.put("/api/visits/V-aaaaaaaa", json=body(outcome="COMPLETED"))
    client.put("/api/visits/V-bbbbbbbb", json=body(kiosk_id="PTYK002", outcome="ABANDONED"))
    client.put("/api/visits/V-cccccccc", json=body(outcome="DECLINED_PRIVACY"))
    client.put("/api/visits/V-dddddddd", json=body(outcome="UNDER_18"))
    assert client.get("/api/visits/summary").status_code == 401
    s = client.get("/api/visits/summary", headers=PIN).json()
    assert s["entries_total"] == 4
    assert s["outcomes"]["COMPLETED"] == s["outcomes"]["ABANDONED"] == s["outcomes"]["DECLINED_PRIVACY"] == s["outcomes"]["UNDER_18"] == 1
    assert s["by_kiosk"] == {"PTYK001": 3, "PTYK002": 1}
    assert sum(d["entries"] for d in s["daily"]) == 4


def test_listing_visits_requires_pin(client):
    client.put(f"/api/visits/{VID}", json=body())
    assert client.get("/api/visits").status_code == 401
    assert len(client.get("/api/visits", headers=PIN).json()) == 1
