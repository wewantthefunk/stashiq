from app.auth import hash_password
from app.models import User


def test_operator_cannot_create_bin(client, db_session):
    operator = User(
        username="op1",
        password_hash=hash_password("secret123"),
        role="operator",
    )
    db_session.add(operator)
    db_session.commit()

    login = client.post(
        "/api/auth/login",
        data={"username": "op1", "password": "secret123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/bins",
        json={"id": "B9", "name": "Test"},
        headers=headers,
    )
    assert response.status_code == 403
