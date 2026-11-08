def test_adjust_inventory_creates_audit_log(client, auth_headers, db_session):
    headers, user = auth_headers

    client.post(
        "/api/bins",
        json={"id": "B1", "name": "Gear"},
        headers=headers,
    )
    item_resp = client.post(
        "/api/items",
        json={"name": "Cone", "category": "agility"},
        headers=headers,
    )
    item_id = item_resp.json()["id"]

    adjust = client.post(
        f"/api/bins/B1/adjust",
        json={"item_id": item_id, "change_amount": 10, "notes": "Restock"},
        headers=headers,
    )
    assert adjust.status_code == 200
    assert adjust.json()["quantity"] == 10

    logs = client.get("/api/logs", headers=headers)
    assert logs.status_code == 200
    entries = logs.json()
    assert len(entries) == 1
    entry = entries[0]
    assert entry["user_id"] == str(user.id)
    assert entry["username"] == "coach1@example.com"
    assert entry["bin_name"] == "Gear"
    assert entry["item_name"] == "Cone"
    assert entry["change_amount"] == 10
    assert entry["previous_quantity"] == 0
    assert entry["new_quantity"] == 10


def test_quantity_cannot_go_below_zero(client, auth_headers):
    headers, _ = auth_headers

    client.post("/api/bins", json={"id": "B1", "name": "Gear"}, headers=headers)
    item_resp = client.post(
        "/api/items",
        json={"name": "Ball", "category": "sports"},
        headers=headers,
    )
    item_id = item_resp.json()["id"]

    client.post(
        "/api/bins/B1/adjust",
        json={"item_id": item_id, "change_amount": 3},
        headers=headers,
    )

    bad = client.post(
        "/api/bins/B1/adjust",
        json={"item_id": item_id, "change_amount": -5},
        headers=headers,
    )
    assert bad.status_code == 400
    assert "below zero" in bad.json()["detail"].lower()
