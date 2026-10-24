from fastapi.testclient import TestClient

from app.main import app
from app.core.settings import settings

client = TestClient(app)


def test_health_check():
    response = client.get("/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_cors():
    respone = client.options(
        "/health/",
        headers={"Origin": settings.frontend_origins[0],
                 "Access-Control-Request-Method": "GET"
                 },

    )
    assert respone.status_code == 200
    assert respone.headers["Access-Control-Allow-Origin"] == settings.frontend_origins[0]
