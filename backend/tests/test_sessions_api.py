import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.core.database import get_db
from app.main import app
from app.models.access_points import AccessPoint, AccessPointType
from app.models.admin_user import AdminUser
from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.assessment_session import AssessmentSession, CompletionStatus
from app.models.rewards import Reward, TriggerType
from app.routers.auth import get_current_admin
from tests.helpers import valid


def _capture_statements(engine, request):
    statements = []

    def before_cursor_execute(
        _conn, _cursor, statement, _parameters, _context, _executemany
    ):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        response = request()
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)
    return response, statements


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(autouse=True)
def override_admin_auth():
    """Provides an authenticated admin for protected sessions endpoints."""
    def _mock_admin():
        return AdminUser(
            id=1,
            name="Test Superadmin",
            email="superadmin@cclas.org",
            role="superadmin",
            is_active=True,
        )

    app.dependency_overrides[get_current_admin] = _mock_admin
    yield
    app.dependency_overrides.pop(get_current_admin, None)


def test_server_recalculates_total_and_classification(client):
    r = client.post("/api/sessions", json=valid(total_literacy_score=9, internal_zone_classification="GREEN"))
    assert r.status_code == 201
    assert r.json()["total_literacy_score"] == 5 and r.json()["internal_zone_classification"] == "YELLOW"


def test_post_is_idempotent_by_session_id(client, db):
    assert client.post("/api/sessions", json=valid()).status_code == 201
    assert client.post("/api/sessions", json=valid(c4_cybersecurity_score=3)).status_code == 200
    assert db.query(AssessmentSession).count() == 1
    assert db.query(AssessmentResult).one().total_literacy_score == 5


def test_new_post_uses_at_most_eight_sql_statements(client, db, engine):
    db.add(
        AccessPoint(
            code="PTYK001",
            name="Kiosco PTYK001",
            type=AccessPointType.KIOSK,
        )
    )
    db.commit()

    response, statements = _capture_statements(
        engine, lambda: client.post("/api/sessions", json=valid())
    )

    assert response.status_code == 201
    print(f"New POST /api/sessions SQL statements: {len(statements)}")
    assert len(statements) <= 8


def test_hashed_session_ids_are_distinct_for_similar_session_ids(client, db):
    session_ids = (
        "SES-1A",
        "SES-1B",
        "SES-m5k9p2abcdef",
        "SES-m5k9p2ghijkl",
    )
    for session_id in session_ids:
        response = client.post("/api/sessions", json=valid(session_id=session_id))
        assert response.status_code == 201

    persisted_ids = [row.session_id for row in db.query(AssessmentSession).all()]
    assert len(persisted_ids) == 4
    assert len(set(persisted_ids)) == 4
    assert all(session_id >= 1_000_000 for session_id in persisted_ids)


def test_completed_session_retry_preserves_persisted_data(client, db, engine):
    original = valid(session_id="SES-completed-retry")
    assert client.post("/api/sessions", json=original).status_code == 201

    response, statements = _capture_statements(
        engine,
        lambda: client.post(
            "/api/sessions",
            json=valid(
                session_id=original["session_id"],
                kiosk_id="PTYK002",
                age_range="18_24",
                zone_code="Z002",
                c1_visual_signs_score=0,
                c2_sentence_comprehension_score=0,
                c3_mobile_icons_score=0,
                c4_cybersecurity_score=0,
                completion_status="COMPLETED",
                duration_seconds=10,
                reward_issued=False,
                iot_trigger_type="NONE",
            ),
        ),
    )

    assert response.status_code == 200
    print(f"COMPLETED retry POST /api/sessions SQL statements: {len(statements)}")
    assert len(statements) <= 2
    assert all(
        statement.lstrip().upper().startswith("SELECT") for statement in statements
    )
    assert response.json()["total_literacy_score"] == 5
    assert response.json()["internal_zone_classification"] == "YELLOW"
    assert response.json()["reward_issued"] is True
    assert response.json()["iot_trigger_type"] == "WIFI_CREDENTIAL"

    db.expire_all()
    session_row = db.query(AssessmentSession).one()
    result_row = db.query(AssessmentResult).one()
    reward_row = db.query(Reward).one()
    assert session_row.completion_status == CompletionStatus.COMPLETED
    assert session_row.access_point_code == "PTYK001"
    assert session_row.zone_code == "Z001"
    assert session_row.duration_seconds == 95
    assert result_row.total_literacy_score == 5
    assert result_row.literacy_classification == LiteracyClassification.YELLOW
    assert (
        result_row.c1_visual_signs_score,
        result_row.c2_sentence_comprehension_score,
        result_row.c3_mobile_icons_score,
        result_row.c4_cybersecurity_score,
    ) == (1, 1, 1, 2)
    assert reward_row.issued is True
    assert reward_row.trigger_type == TriggerType.WIFI_CREDENTIAL


@pytest.mark.parametrize(
    "existing_status",
    [CompletionStatus.IN_PROGRESS, CompletionStatus.ABANDONED],
)
def test_incomplete_session_can_be_completed(client, db, existing_status):
    session_id = "SES-progress-transition"
    assert (
        client.post(
            "/api/sessions",
            json=valid(session_id=session_id, completion_status="ABANDONED"),
        ).status_code
        == 201
    )
    session_row = db.query(AssessmentSession).one()
    session_row.completion_status = existing_status
    db.commit()

    response = client.post(
        "/api/sessions",
        json=valid(
            session_id=session_id,
            completion_status="COMPLETED",
            c1_visual_signs_score=2,
            c2_sentence_comprehension_score=2,
            c3_mobile_icons_score=2,
            c4_cybersecurity_score=3,
        ),
    )

    assert response.status_code == 200
    assert response.json()["total_literacy_score"] == 9
    db.expire_all()
    assert db.query(AssessmentSession).one().completion_status == CompletionStatus.COMPLETED
    assert db.query(AssessmentResult).one().total_literacy_score == 9


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


def test_listing_and_metrics_require_admin_auth(client):
    client.post("/api/sessions", json=valid())

    # Temporarily remove admin override to verify unauthenticated rejection
    app.dependency_overrides.pop(get_current_admin, None)
    try:
        assert client.get("/api/sessions").status_code == 401
        assert client.get("/api/sessions", headers={"X-Dashboard-Pin": "2026"}).status_code == 401
        assert client.get("/api/metrics").status_code == 401
        assert client.get("/api/metrics", headers={"X-Dashboard-Pin": "2026"}).status_code == 401
    finally:
        app.dependency_overrides[get_current_admin] = lambda: AdminUser(
            id=1,
            name="Test Superadmin",
            email="superadmin@cclas.org",
            role="superadmin",
            is_active=True,
        )

    # With admin auth override active
    ok = client.get("/api/sessions")
    assert ok.status_code == 200 and len(ok.json()) == 1
    m = client.get("/api/metrics").json()
    assert m["total_sessions"] == 1 and m["tiers"]["YELLOW"] == 1


def test_listing_query_count_is_constant_as_sessions_grow(client, engine):
    for index in range(12):
        response = client.post(
            "/api/sessions",
            json=valid(session_id=f"SES-list-{index}"),
        )
        assert response.status_code == 201

    response_two, statements_two = _capture_statements(
        engine, lambda: client.get("/api/sessions?limit=2")
    )
    response_twelve, statements_twelve = _capture_statements(
        engine, lambda: client.get("/api/sessions?limit=12")
    )

    assert response_two.status_code == response_twelve.status_code == 200
    assert len(response_two.json()) == 2
    assert len(response_twelve.json()) == 12
    print(
        "GET /api/sessions SQL statements for 2 and 12 rows: "
        f"{len(statements_two)}, {len(statements_twelve)}"
    )
    assert len(statements_two) == len(statements_twelve)
    assert len(statements_twelve) <= 4


def test_listing_limit_zero_is_clamped_to_one(client):
    for index in range(2):
        response = client.post(
            "/api/sessions",
            json=valid(session_id=f"SES-limit-{index}"),
        )
        assert response.status_code == 201

    response = client.get("/api/sessions?limit=0")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_reference_endpoints_are_public(client):
    assert len(client.get("/api/zones").json()) == 36
    assert {k["code"] for k in client.get("/api/kiosks").json()} >= {"PTYK001", "DIRECT_WEB"}
