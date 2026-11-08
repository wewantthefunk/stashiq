def test_create_bin_and_list(client, auth_headers):
    headers, _ = auth_headers
    create = client.post(
        "/api/bins",
        json={"id": "B1", "name": "Cones & Agility Gear"},
        headers=headers,
    )
    assert create.status_code == 201
    assert create.json()["id"] == "B1"

    listed = client.get("/api/bins", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_cannot_delete_bin_with_stock(client, auth_headers, inventory_action):
    headers, _ = auth_headers
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
            "change_amount": 2,
            "action_id": inventory_action,
        },
        headers=headers,
    )

    blocked = client.delete("/api/bins/B1", headers=headers)
    assert blocked.status_code == 400
    assert "empty" in blocked.json()["detail"].lower()


def test_delete_empty_bin(client, auth_headers, inventory_action):
    headers, _ = auth_headers
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
            "change_amount": 2,
            "action_id": inventory_action,
        },
        headers=headers,
    )
    client.post(
        "/api/bins/B1/adjust",
        json={
            "item_id": item["id"],
            "change_amount": -2,
            "action_id": inventory_action,
        },
        headers=headers,
    )

    deleted = client.delete("/api/bins/B1", headers=headers)
    assert deleted.status_code == 204

    missing = client.get("/api/bins/B1", headers=headers)
    assert missing.status_code == 404

    logs = client.get("/api/logs", headers=headers)
    assert logs.status_code == 200
    assert any(e["bin_id"] == "B1" for e in logs.json())


def test_bin_qr_returns_png(client, auth_headers):
    headers, _ = auth_headers
    client.post(
        "/api/bins",
        json={"id": "B2", "name": "Balls"},
        headers=headers,
    )

    response = client.get("/api/bins/B2/qr", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content[:8] == b"\x89PNG\r\n\x1a\n"
