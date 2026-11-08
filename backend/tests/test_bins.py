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
