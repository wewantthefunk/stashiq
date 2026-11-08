"""Resolve the public site URL used in QR codes (PUBLIC_URL overrides FRONTEND_BASE_URL)."""
import os


def normalize_public_url(raw: str) -> str:
    value = raw.strip().rstrip("/")
    if not value:
        return ""
    if not value.startswith(("http://", "https://")):
        value = f"https://{value}"
    return value


def public_site_url() -> str:
    """Base URL for deep links in QR codes and labels."""
    explicit = normalize_public_url(os.getenv("PUBLIC_URL", ""))
    if explicit:
        return explicit
    return os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")


def bin_deep_link(bin_id: str) -> str:
    return f"{public_site_url()}/bins/{bin_id}"
