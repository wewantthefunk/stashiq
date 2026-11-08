def test_create_action_list_and_delete(client, auth_headers):
    headers, _ = auth_headers

    create = client.post(
        "/api/actions",
        json={"id": "CLASS", "name": "Used in class"},
        headers=headers,
    )
    assert create.status_code == 201

    listed = client.get("/api/actions", headers=headers)
    assert listed.status_code == 200
    assert any(a["id"] == "CLASS" for a in listed.json())

    deleted = client.delete("/api/actions/CLASS", headers=headers)
    assert deleted.status_code == 204


def test_adjust_requires_valid_action(client, auth_headers, inventory_action):
    headers, _ = auth_headers
    client.post("/api/bins", json={"id": "B1", "name": "Gear"}, headers=headers)
    item = client.post(
        "/api/items",
        json={"name": "Ball", "category": "balls"},
        headers=headers,
    ).json()

    bad = client.post(
        "/api/bins/B1/adjust",
        json={
            "item_id": item["id"],
            "change_amount": 1,
            "action_id": "MISSING",
        },
        headers=headers,
    )
    assert bad.status_code == 404

    ok = client.post(
        "/api/bins/B1/adjust",
        json={
            "item_id": item["id"],
            "change_amount": 1,
            "action_id": inventory_action,
        },
        headers=headers,
    )
    assert ok.status_code == 200
