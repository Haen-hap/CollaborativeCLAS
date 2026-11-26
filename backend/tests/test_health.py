from fastapi.testclient import TestClient

from app.main import app
from app.core.settings import settings
from app.routers import db_health

client = TestClient(app)


def test_health_check():
    response = client.get("/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_health_check_is_public_from_lan_ip():
    response = client.get("/health/", headers={"X-Real-IP": "10.42.0.53"})
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_database_status_rejects_lan_ip():
    response = client.get("/database-status", headers={"X-Real-IP": "10.42.0.53"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Acceso restringido a la red administrativa autorizada"


def test_database_status_allows_loopback(monkeypatch):
    monkeypatch.setattr(db_health, "check_database_connection", lambda: True)
    response = client.get("/database-status", headers={"X-Real-IP": "127.0.0.1"})
    assert response.status_code == 200
    assert response.json() == {"Connection:": True}


def test_database_status_returns_generic_error_on_database_failure(monkeypatch):
    monkeypatch.setattr(db_health, "check_database_connection", lambda: False)
    response = client.get("/database-status", headers={"X-Real-IP": "127.0.0.1"})
    assert response.status_code == 503
    assert response.json() == {"detail": "Database connection failed"}


def test_cors():
    respone = client.options(
        "/health/",
        headers={"Origin": settings.cors_list[0],
                 "Access-Control-Request-Method": "GET"
                 },

    )
    assert respone.status_code == 200
    assert respone.headers["Access-Control-Allow-Origin"] == settings.cors_list[0]
