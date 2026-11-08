import io

import qrcode
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.site_url import public_site_url

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/public")
def public_config():
    """App URLs for sharing (PUBLIC_URL for internet; FRONTEND_BASE_URL for local LAN)."""
    import os

    public = public_site_url()
    local = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    lan_ip = os.getenv("LAN_IP", "").strip() or None
    port = os.getenv("FRONTEND_HOST_PORT", "3000")
    explicit = os.getenv("PUBLIC_URL", "").strip() or None
    return {
        "public_url": public,
        "public_url_configured": explicit,
        "frontend_base_url": local,
        "frontend_port": int(port),
        "lan_ip": lan_ip,
        "phone_url": explicit or local,
        "localhost_url": f"http://localhost:{port}",
        "note": "Bin QR codes use public_url.",
    }


@router.get("/access-qr")
def access_qr_png():
    """QR encoding the coach app root URL."""
    url = public_site_url()
    img = qrcode.make(url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")
