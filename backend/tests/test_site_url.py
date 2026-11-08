from importlib import reload

import app.site_url as site_url


def test_bin_deep_link_prefers_public_url(monkeypatch):
    monkeypatch.setenv("PUBLIC_URL", "stashiq-test.wewantthefunk.top")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://192.168.1.11:3000")
    reload(site_url)
    assert (
        site_url.bin_deep_link("B1")
        == "https://stashiq-test.wewantthefunk.top/bins/B1"
    )


def test_bin_deep_link_falls_back_to_frontend_base(monkeypatch):
    monkeypatch.delenv("PUBLIC_URL", raising=False)
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")
    reload(site_url)
    assert site_url.bin_deep_link("B3") == "http://localhost:3000/bins/B3"
