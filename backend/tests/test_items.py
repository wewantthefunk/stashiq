def test_update_item_name_and_category(client, auth_headers):
    headers, _ = auth_headers

    created = client.post(
        "/api/items",
        json={"name": "Soccer bal", "category": "ballz", "sku": "SB-1"},
        headers=headers,
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    updated = client.patch(
        f"/api/items/{item_id}",
        json={"name": "Soccer ball", "category": "balls"},
        headers=headers,
    )
    assert updated.status_code == 200
    data = updated.json()
    assert data["name"] == "Soccer ball"
    assert data["category"] == "balls"
    assert data["sku"] == "SB-1"


def test_operator_cannot_update_item(client, auth_headers, db_session):
    from app.auth import hash_password
    from app.models import User

    admin_headers, _ = auth_headers
    item = client.post(
        "/api/items",
        json={"name": "Cone", "category": "agility"},
        headers=admin_headers,
    ).json()

    operator = User(
        username="op@example.com",
        password_hash=hash_password("secret123"),
        role="operator",
        password_set=True,
    )
    db_session.add(operator)
    db_session.commit()

    login = client.post(
        "/api/auth/login",
        data={"username": "op@example.com", "password": "secret123"},
    )
    op_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    denied = client.patch(
        f"/api/items/{item['id']}",
        json={"name": "Nope"},
        headers=op_headers,
    )
    assert denied.status_code == 403
