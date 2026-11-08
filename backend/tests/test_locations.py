def test_create_location_list_and_delete(client, auth_headers):
    headers, _ = auth_headers

    create = client.post(
        "/api/locations",
        json={
            "id": "VAN1",
            "name": "Blue van",
            "address": "123 Main St, Austin TX",
        },
        headers=headers,
    )
    assert create.status_code == 201
    assert create.json()["id"] == "VAN1"

    listed = client.get("/api/locations", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    client.post(
        "/api/bins",
        json={"id": "B1", "name": "Gear", "location_id": "VAN1"},
        headers=headers,
    )

    deleted = client.delete("/api/locations/VAN1", headers=headers)
    assert deleted.status_code == 204

    bin_row = client.get("/api/bins/B1", headers=headers)
    assert bin_row.json()["location_id"] is None


def test_list_bins_filtered_by_location(client, auth_headers):
    headers, _ = auth_headers

    client.post(
        "/api/locations",
        json={"id": "GYM", "name": "Gym", "address": "Gym address"},
        headers=headers,
    )
    client.post(
        "/api/locations",
        json={"id": "VAN", "name": "Van", "address": "Van address"},
        headers=headers,
    )
    client.post(
        "/api/bins",
        json={"id": "B1", "name": "One", "location_id": "GYM"},
        headers=headers,
    )
    client.post(
        "/api/bins",
        json={"id": "B2", "name": "Two", "location_id": "VAN"},
        headers=headers,
    )
    client.post("/api/bins", json={"id": "B3", "name": "Three"}, headers=headers)

    gym = client.get("/api/bins?location_id=GYM", headers=headers)
    assert {b["id"] for b in gym.json()} == {"B1"}

    unassigned = client.get("/api/bins?location_id=", headers=headers)
    assert {b["id"] for b in unassigned.json()} == {"B3"}


def test_search_items_filtered_by_location(client, auth_headers, inventory_action):
    headers, _ = auth_headers

    client.post(
        "/api/locations",
        json={"id": "GYM", "name": "Gym", "address": "Addr"},
        headers=headers,
    )
    client.post(
        "/api/bins",
        json={"id": "B1", "name": "Gym bin", "location_id": "GYM"},
        headers=headers,
    )
    client.post("/api/bins", json={"id": "B2", "name": "Other"}, headers=headers)
    ball = client.post(
        "/api/items",
        json={"name": "Soccer ball", "category": "balls"},
        headers=headers,
    ).json()

    client.post(
        f"/api/bins/B1/adjust",
        json={
            "item_id": ball["id"],
            "change_amount": 2,
            "action_id": inventory_action,
        },
        headers=headers,
    )
    client.post(
        f"/api/bins/B2/adjust",
        json={
            "item_id": ball["id"],
            "change_amount": 5,
            "action_id": inventory_action,
        },
        headers=headers,
    )

    all_hits = client.get("/api/search/items?q=soccer", headers=headers)
    assert len(all_hits.json()) == 2

    gym_hits = client.get(
        "/api/search/items?q=soccer&location_id=GYM",
        headers=headers,
    )
    assert len(gym_hits.json()) == 1
    assert gym_hits.json()[0]["bin_id"] == "B1"
    assert gym_hits.json()[0]["location_name"] == "Gym"
