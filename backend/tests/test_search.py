from app.auth import hash_password
from app.models import User


def test_search_finds_bins_with_matching_item(client, db_session):
    admin = User(
        username="searchadmin",
        password_hash=hash_password("secret123"),
        role="admin",
    )
    db_session.add(admin)
    db_session.commit()

    login = client.post(
        "/api/auth/login",
        data={"username": "searchadmin", "password": "secret123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    client.post("/api/bins", json={"id": "B1", "name": "Van"}, headers=headers)
    client.post("/api/bins", json={"id": "B2", "name": "Gym"}, headers=headers)
    ball = client.post(
        "/api/items",
        json={"name": "Soccer ball", "category": "balls"},
        headers=headers,
    ).json()
    cone = client.post(
        "/api/items",
        json={"name": "Agility cone", "category": "agility"},
        headers=headers,
    ).json()

    client.post(
        f"/api/bins/B1/adjust",
        json={"item_id": ball["id"], "change_amount": 5},
        headers=headers,
    )
    client.post(
        f"/api/bins/B2/adjust",
        json={"item_id": ball["id"], "change_amount": 12},
        headers=headers,
    )
    client.post(
        f"/api/bins/B1/adjust",
        json={"item_id": cone["id"], "change_amount": 3},
        headers=headers,
    )

    response = client.get("/api/search/items?q=soccer", headers=headers)
    assert response.status_code == 200
    hits = response.json()
    assert len(hits) == 2
    assert {h["bin_id"] for h in hits} == {"B1", "B2"}
    assert all(h["item"]["name"] == "Soccer ball" for h in hits)
    by_bin = {h["bin_id"]: h["quantity"] for h in hits}
    assert by_bin["B1"] == 5
    assert by_bin["B2"] == 12
