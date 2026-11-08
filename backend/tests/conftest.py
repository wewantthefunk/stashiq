import os

# Must be set before app modules load so tests never require Postgres locally.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password
from app.database import Base, engine, get_db
from app.main import app
from app.models import User


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def inventory_action(client, auth_headers):
    headers, _ = auth_headers
    response = client.post(
        "/api/actions",
        json={"id": "RESTOCK", "name": "Restock"},
        headers=headers,
    )
    assert response.status_code == 201
    return "RESTOCK"


@pytest.fixture
def auth_headers(client, db_session):
    user = User(
        username="coach1@example.com",
        password_hash=hash_password("secret123"),
        role="admin",
        password_set=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    response = client.post(
        "/api/auth/login",
        data={"username": "coach1@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, user
