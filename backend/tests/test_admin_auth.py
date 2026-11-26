import pytest
from pydantic import ValidationError

from app.models.admin_user import AdminUser
from app.core.security import create_signed_token, hash_pin_or_password
from app.core.settings import Settings, settings


@pytest.mark.parametrize(
    ("admin_secret_key", "admin_invite_code"),
    [
        (None, "TEST-ONLY-INVITE-CODE"),
        (" ", "TEST-ONLY-INVITE-CODE"),
        ("short", "TEST-ONLY-INVITE-CODE"),
        ("a" + " " * 31, "TEST-ONLY-INVITE-CODE"),
        ("gbm-cclas-admin-secret-key-change-in-production-2026", "TEST-ONLY-INVITE-CODE"),
        ("a" * 32 + "<change-me>", "TEST-ONLY-INVITE-CODE"),
        ("test-only-admin-secret-key-0123456789abcdef", "GBM-ADMIN-2026"),
        ("test-only-admin-secret-key-0123456789abcdef", " "),
        ("test-only-admin-secret-key-0123456789abcdef", "<change-me>"),
        ("test-only-admin-secret-key-0123456789abcdef", "INVITE-<change-me>-CODE"),
    ],
)
def test_settings_reject_missing_or_insecure_admin_credentials(
    monkeypatch, admin_secret_key, admin_invite_code
):
    monkeypatch.delenv("ADMIN_SECRET_KEY", raising=False)
    values = {
        "_env_file": None,
        "database_url": "sqlite://",
        "admin_invite_code": admin_invite_code,
    }
    if admin_secret_key is not None:
        values["admin_secret_key"] = admin_secret_key

    with pytest.raises(ValidationError):
        Settings(**values)


def test_auth_status_network_detection(test_client):
    # Allowed IP (testclient resolves to 127.0.0.1)
    res_allowed = test_client.get("/api/auth/status")
    assert res_allowed.status_code == 200
    data_allowed = res_allowed.json()
    assert data_allowed["network_allowed"] is True
    assert data_allowed["has_admins"] is False

    # Blocked IP via X-Real-IP
    res_blocked = test_client.get(
        "/api/auth/status",
        headers={"X-Real-IP": "10.42.0.53"},
    )
    assert res_blocked.status_code == 200
    data_blocked = res_blocked.json()
    assert data_blocked["network_allowed"] is False


def test_unauthorized_ip_returns_403(test_client):
    unauthorized_headers = {"X-Real-IP": "10.42.0.53"}

    # Register blocked
    res_reg = test_client.post(
        "/api/auth/register",
        json={"name": "Attacker", "email": "att@domain.com", "pin": "1234"},
        headers=unauthorized_headers,
    )
    assert res_reg.status_code == 403
    assert "Acceso restringido a la red administrativa autorizada" in res_reg.json()["detail"]

    # Login blocked
    res_login = test_client.post(
        "/api/auth/login",
        json={"email": "att@domain.com", "pin": "1234"},
        headers={"X-Real-IP": "203.0.113.10"},
    )
    assert res_login.status_code == 403
    assert "Acceso restringido a la red administrativa autorizada" in res_login.json()["detail"]

    # Analytics blocked even with token
    valid_token = create_signed_token({"sub": "admin@cclas.org", "uid": 1, "role": "admin"}, settings.admin_secret_key)
    res_analytics = test_client.get(
        "/analytics/summary",
        headers={
            "X-Real-IP": "10.42.0.88",
            "Authorization": f"Bearer {valid_token}",
        },
    )
    assert res_analytics.status_code == 403


def test_bootstrap_first_admin_creates_superadmin(test_client, db_session):
    payload = {
        "name": "Super Admin",
        "email": "SUPERADMIN@cclas.org",
        "pin": "supersecret2026",
    }
    response = test_client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "superadmin"
    assert data["user"]["email"] == "superadmin@cclas.org"
    assert data["user"]["name"] == "Super Admin"

    # Status now shows has_admins: True
    status_res = test_client.get("/api/auth/status")
    assert status_res.json()["has_admins"] is True


def test_duplicate_email_returns_409(test_client, db_session):
    payload = {
        "name": "Super Admin",
        "email": "admin@cclas.org",
        "pin": "supersecret2026",
    }
    res1 = test_client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = test_client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "ya está registrado" in res2.json()["detail"]


def test_subsequent_admin_registration_requires_invite_code(test_client, db_session):
    # First admin (bootstrap)
    test_client.post(
        "/api/auth/register",
        json={"name": "First Admin", "email": "first@cclas.org", "pin": "pass1234"},
    )

    # Second admin without invite code -> 403
    res_no_invite = test_client.post(
        "/api/auth/register",
        json={"name": "Second Admin", "email": "second@cclas.org", "pin": "pass1234"},
    )
    assert res_no_invite.status_code == 403

    # Second admin with wrong invite code -> 403
    res_wrong_invite = test_client.post(
        "/api/auth/register",
        json={
            "name": "Second Admin",
            "email": "second@cclas.org",
            "pin": "pass1234",
            "invite_code": "WRONG-CODE",
        },
    )
    assert res_wrong_invite.status_code == 403

    # Second admin with valid invite code -> 201, role='admin'
    res_valid_invite = test_client.post(
        "/api/auth/register",
        json={
            "name": "Second Admin",
            "email": "second@cclas.org",
            "pin": "pass1234",
            "invite_code": settings.admin_invite_code,
        },
    )
    assert res_valid_invite.status_code == 201
    assert res_valid_invite.json()["user"]["role"] == "admin"


def test_login_success_and_wrong_pin(test_client, db_session):
    user = AdminUser(
        name="Login User",
        email="login@cclas.org",
        password_hash=hash_pin_or_password("correct-pin-123"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    # Wrong PIN
    res_wrong = test_client.post(
        "/api/auth/login",
        json={"email": "login@cclas.org", "pin": "wrong-pin"},
    )
    assert res_wrong.status_code == 401
    assert "Credenciales incorrectas" in res_wrong.json()["detail"]

    # Correct PIN
    res_ok = test_client.post(
        "/api/auth/login",
        json={"email": "login@cclas.org", "pin": "correct-pin-123"},
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert "token" in data
    assert data["user"]["email"] == "login@cclas.org"


def test_auth_me_and_logout(test_client, db_session):
    user = AdminUser(
        name="Profile User",
        email="profile@cclas.org",
        password_hash=hash_pin_or_password("profile-pass"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_signed_token({"sub": user.email, "uid": user.id, "role": user.role}, settings.admin_secret_key)

    # Missing token -> 401
    res_no_tok = test_client.get("/api/auth/me")
    assert res_no_tok.status_code == 401

    # Valid token
    res_me = test_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "profile@cclas.org"
    assert res_me.json()["name"] == "Profile User"

    # Logout
    res_logout = test_client.post("/api/auth/logout")
    assert res_logout.status_code == 200
    assert res_logout.json()["ok"] is True


def test_pin_length_validation(test_client):
    res_short = test_client.post(
        "/api/auth/register",
        json={"name": "Short Pin", "email": "short@cclas.org", "pin": "123"},
    )
    assert res_short.status_code == 422


def test_admin_dashboard_stats_requires_auth_and_network_gate(test_client, db_session):
    from app.models.access_points import AccessPoint, AccessPointType
    from app.models.assessment_results import AssessmentResult, LiteracyClassification
    from app.models.assessment_session import (
        AgeRange,
        AssessmentSession,
        CompletionStatus,
        SchoolingLevel,
        WorkStatus,
    )
    from app.models.zone import Zone

    user = AdminUser(
        name="Dashboard Admin",
        email="dashboard@cclas.org",
        password_hash=hash_pin_or_password("dash-pass-123"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_signed_token(
        {"sub": user.email, "uid": user.id, "role": user.role},
        settings.admin_secret_key,
    )

    # 1. Without token -> 401 Unauthorized
    res_no_auth = test_client.get("/admin/dashboard/stats")
    assert res_no_auth.status_code == 401

    # 2. Unauthorized IP even with valid Bearer token -> 403 Forbidden
    res_bad_ip = test_client.get(
        "/admin/dashboard/stats",
        headers={
            "X-Real-IP": "10.42.0.53",
            "Authorization": f"Bearer {token}",
        },
    )
    assert res_bad_ip.status_code == 403

    # Seed representative assessment results for red/yellow/green
    db_session.add_all(
        [
            AccessPoint(code="DIRECT_WEB", name="Direct Web", type=AccessPointType.WEB),
            Zone(code="Z001", name="Test Zone"),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            AssessmentSession(
                session_id=501,
                access_point_code="DIRECT_WEB",
                assisted_mode=False,
                age_range=AgeRange.AGE_18_24,
                work_status=WorkStatus.STUDENT,
                schooling_level=SchoolingLevel.TERTIARY,
                zone_code="Z001",
                location_declined=False,
                completion_status=CompletionStatus.COMPLETED,
                duration_seconds=60,
            ),
            AssessmentSession(
                session_id=502,
                access_point_code="DIRECT_WEB",
                assisted_mode=False,
                age_range=AgeRange.AGE_18_24,
                work_status=WorkStatus.STUDENT,
                schooling_level=SchoolingLevel.TERTIARY,
                zone_code="Z001",
                location_declined=False,
                completion_status=CompletionStatus.COMPLETED,
                duration_seconds=70,
            ),
        ]
    )
    db_session.flush()
    db_session.add_all(
        [
            AssessmentResult(
                session_id=501,
                c1_visual_signs_score=1,
                c2_sentence_comprehension_score=1,
                c3_mobile_icons_score=0,
                c4_cybersecurity_score=0,
                total_literacy_score=2,
                literacy_classification=LiteracyClassification.RED,
            ),
            AssessmentResult(
                session_id=502,
                c1_visual_signs_score=2,
                c2_sentence_comprehension_score=2,
                c3_mobile_icons_score=2,
                c4_cybersecurity_score=3,
                total_literacy_score=9,
                literacy_classification=LiteracyClassification.GREEN,
            ),
        ]
    )
    db_session.commit()

    # 3. Valid admin token + allowed IP -> 200 OK with expected keys and lowercase distribution
    res_ok = test_client.get(
        "/admin/dashboard/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert set(data.keys()) == {
        "total_submissions",
        "average_score_percentage",
        "classification_distribution",
    }
    assert data["total_submissions"] == 2
    assert data["average_score_percentage"] == 61.1
    assert data["classification_distribution"] == {
        "red": 1,
        "yellow": 0,
        "green": 1,
    }
