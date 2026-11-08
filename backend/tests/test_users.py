from app.auth import hash_password
from app.models import User


def _admin_headers(client, db_session):
    admin = User(
        username="admin@example.com",
        password_hash=hash_password("secret123"),
        role="admin",
        password_set=True,
    )
    db_session.add(admin)
    db_session.commit()
    token = client.post(
        "/api/auth/login",
        data={"username": "admin@example.com", "password": "secret123"},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_lists_and_creates_users(client, db_session):
    headers = _admin_headers(client, db_session)

    create = client.post(
        "/api/users",
        json={"email": "coach2@example.com", "role": "operator"},
        headers=headers,
    )
    assert create.status_code == 201
    body = create.json()
    assert body["role"] == "operator"
    assert body["email"] == "coach2@example.com"
    assert body["password_set"] is False

    listed = client.get("/api/users", headers=headers)
    assert listed.status_code == 200
    emails = {u["email"] for u in listed.json()}
    assert "coach2@example.com" in emails
    assert "admin@example.com" in emails


def test_invite_accept_and_login(client, db_session):
    headers = _admin_headers(client, db_session)
    create = client.post(
        "/api/users",
        json={"email": "newcoach@example.com", "role": "operator"},
        headers=headers,
    )
    invite_url = create.json()["invite_url"]
    assert invite_url
    token = invite_url.split("token=")[-1]

    verify = client.get(f"/api/auth/invite?token={token}")
    assert verify.status_code == 200
    assert verify.json()["valid"] is True
    assert verify.json()["email"] == "newcoach@example.com"

    accept = client.post(
        "/api/auth/invite/accept",
        json={"token": token, "password": "mypass99"},
    )
    assert accept.status_code == 200
    assert "access_token" in accept.json()

    login = client.post(
        "/api/auth/login",
        data={"username": "newcoach@example.com", "password": "mypass99"},
    )
    assert login.status_code == 200


def test_cannot_login_before_password_set(client, db_session):
    headers = _admin_headers(client, db_session)
    client.post(
        "/api/users",
        json={"email": "pending@example.com", "role": "operator"},
        headers=headers,
    )
    login = client.post(
        "/api/auth/login",
        data={"username": "pending@example.com", "password": "anything"},
    )
    assert login.status_code == 401


def test_operator_cannot_list_users(client, db_session):
    _admin_headers(client, db_session)
    op = User(
        username="oponly@example.com",
        password_hash=hash_password("secret123"),
        role="operator",
        password_set=True,
    )
    db_session.add(op)
    db_session.commit()
    token = client.post(
        "/api/auth/login",
        data={"username": "oponly@example.com", "password": "secret123"},
    ).json()["access_token"]
    response = client.get("/api/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_update_role_and_delete_user(client, db_session):
    headers = _admin_headers(client, db_session)
    user_id = client.post(
        "/api/users",
        json={"email": "tempuser@example.com", "role": "operator"},
        headers=headers,
    ).json()["id"]

    patch = client.patch(
        f"/api/users/{user_id}",
        json={"role": "admin"},
        headers=headers,
    )
    assert patch.status_code == 200
    assert patch.json()["role"] == "admin"

    delete = client.delete(f"/api/users/{user_id}", headers=headers)
    assert delete.status_code == 204
