from app.auth import hash_password
from app.models import User


def _login(client, email: str, password: str):
    return client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )


def test_change_password(client, db_session):
    user = User(
        username="coach@example.com",
        password_hash=hash_password("oldpass1"),
        role="operator",
        password_set=True,
    )
    db_session.add(user)
    db_session.commit()

    login = _login(client, "coach@example.com", "oldpass1")
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    bad = client.post(
        "/api/auth/change-password",
        json={"current_password": "wrong", "new_password": "newpass9"},
        headers=headers,
    )
    assert bad.status_code == 400

    ok = client.post(
        "/api/auth/change-password",
        json={"current_password": "oldpass1", "new_password": "newpass9"},
        headers=headers,
    )
    assert ok.status_code == 204

    assert _login(client, "coach@example.com", "oldpass1").status_code == 401
    assert _login(client, "coach@example.com", "newpass9").status_code == 200


def test_forgot_password_without_smtp_still_rotates(client, db_session, monkeypatch):
    user = User(
        username="idle@example.com",
        password_hash=hash_password("remember1"),
        role="operator",
        password_set=True,
    )
    db_session.add(user)
    db_session.commit()

    monkeypatch.delenv("SMTP_HOST", raising=False)

    reset = client.post(
        "/api/auth/forgot-password",
        json={"email": "idle@example.com"},
    )
    assert reset.status_code == 200
    assert "account exists" in reset.json()["message"].lower()
    assert set(reset.json().keys()) == {"message"}

    db_session.refresh(user)
    assert user.invite_token
    assert _login(client, "idle@example.com", "remember1").status_code in (401, 403)


def test_forgot_password_with_smtp_invalidates_old_password(
    client, db_session, monkeypatch
):
    user = User(
        username="forgetful@example.com",
        password_hash=hash_password("remember1"),
        role="operator",
        password_set=True,
    )
    db_session.add(user)
    db_session.commit()

    assert _login(client, "forgetful@example.com", "remember1").status_code == 200

    monkeypatch.setenv("SMTP_HOST", "smtp.test")
    monkeypatch.setattr(
        "app.routers.auth.send_password_reset_email",
        lambda **_: True,
    )

    reset = client.post(
        "/api/auth/forgot-password",
        json={"email": "forgetful@example.com"},
    )
    assert reset.status_code == 200

    db_session.refresh(user)
    assert user.invite_token
    token = user.invite_token

    assert _login(client, "forgetful@example.com", "remember1").status_code in (
        401,
        403,
    )

    accept = client.post(
        "/api/auth/invite/accept",
        json={"token": token, "password": "freshpass1"},
    )
    assert accept.status_code == 200
    assert _login(client, "forgetful@example.com", "freshpass1").status_code == 200


def test_forgot_password_unknown_email_same_message(client, db_session):
    response = client.post(
        "/api/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200
    assert "account exists" in response.json()["message"].lower()
    assert set(response.json().keys()) == {"message"}
