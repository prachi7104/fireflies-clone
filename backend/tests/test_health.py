from fastapi.testclient import TestClient

from app.main import create_app


def test_health_reports_database_and_fts(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["fts5"] is True
    assert body["llm_provider"] == "none"
    assert body["boot_count"] == 1


def test_boot_count_survives_restart_on_same_database(settings):
    with TestClient(create_app(settings)) as first:
        assert first.get("/api/health").json()["boot_count"] == 1
    with TestClient(create_app(settings)) as second:
        assert second.get("/api/health").json()["boot_count"] == 2


def test_cors_allows_configured_origin(client):
    res = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
