import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path):
    return Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        seed_on_startup=False,
        llm_provider="none",
        groq_api_key=None,
        cors_origins="http://localhost:3000",
    )


@pytest.fixture
def app(settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db(client):
    session = client.app.state.SessionLocal()
    try:
        yield session
    finally:
        session.close()
