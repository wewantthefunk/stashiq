from datetime import date

from app.auth import hash_password
from app.models import User


def test_user_activity_report_with_date_range(
    client, auth_headers, db_session, inventory_action
):
    headers, user = auth_headers

    client.post("/api/bins", json={"id": "B1", "name": "Gear"}, headers=headers)
    item = client.post(
        "/api/items",
        json={"name": "Ball", "category": "balls"},
        headers=headers,
    ).json()

    client.post(
        "/api/bins/B1/adjust",
        json={
            "item_id": item["id"],
            "change_amount": 3,
            "action_id": inventory_action,
        },
        headers=headers,
    )
    checkout = client.post(
        "/api/actions",
        json={"id": "CHECKOUT", "name": "Checked out for use"},
        headers=headers,
    )
    assert checkout.status_code == 201
    client.post(
        "/api/bins/B1/adjust",
        json={
            "item_id": item["id"],
            "change_amount": -2,
            "action_id": "CHECKOUT",
        },
        headers=headers,
    )

    me = client.get("/api/auth/me", headers=headers).json()

    resp = client.get(
        f"/api/reports/user-activity?user_id={me['id']}",
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "coach1@example.com"
    assert len(body["entries"]) == 2
    assert body["entries"][0]["change_amount"] == -2
    assert body["entries"][0]["action_id"] == "CHECKOUT"
    assert len(body["action_summary"]) >= 1

    today = date.today()
    ranged = client.get(
        f"/api/reports/user-activity?user_id={me['id']}&from={today.isoformat()}&to={today.isoformat()}",
        headers=headers,
    )
    assert ranged.status_code == 200


def test_operator_cannot_view_other_user_report(client, auth_headers, db_session):
    admin_headers, admin = auth_headers

    operator = User(
        username="rep@example.com",
        password_hash=hash_password("secret123"),
        role="operator",
        password_set=True,
    )
    db_session.add(operator)
    db_session.commit()
    db_session.refresh(operator)
    operator_id = operator.id

    login = client.post(
        "/api/auth/login",
        data={"username": "rep@example.com", "password": "secret123"},
    )
    op_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    denied = client.get(
        f"/api/reports/user-activity?user_id={admin.id}",
        headers=op_headers,
    )
    assert denied.status_code == 403

    ok = client.get(
        f"/api/reports/user-activity?user_id={operator_id}",
        headers=op_headers,
    )
    assert ok.status_code == 200
