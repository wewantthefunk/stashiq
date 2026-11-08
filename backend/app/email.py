import logging
import os
import smtplib
from email.message import EmailMessage

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST", "").strip())


def send_invite_email(*, to_email: str, invite_url: str) -> bool:
    """Send first-time login email. Returns False if SMTP is not configured."""
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        logger.warning(
            "SMTP_HOST not set — invite link for %s: %s", to_email, invite_url
        )
        return False

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", user or "noreply@stashiq.local")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    msg = EmailMessage()
    msg["Subject"] = "You're invited to StashIQ"
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(
        f"Welcome to StashIQ.\n\n"
        f"Set your password and sign in here (link expires in 7 days):\n\n"
        f"{invite_url}\n\n"
        f"If you didn't expect this message, you can ignore it."
    )

    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            if use_tls:
                smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send invite email to %s", to_email)
        return False


def send_password_reset_email(*, to_email: str, reset_url: str) -> bool:
    """Send password reset link (same /welcome flow). Returns False if SMTP is not configured."""
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        logger.warning(
            "SMTP_HOST not set — password reset email was not sent for %s",
            to_email,
        )
        return False

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", user or "noreply@stashiq.local")
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    msg = EmailMessage()
    msg["Subject"] = "Reset your StashIQ password"
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(
        f"You requested a password reset for StashIQ.\n\n"
        f"Choose a new password here (link expires in 7 days):\n\n"
        f"{reset_url}\n\n"
        f"Your previous password no longer works.\n\n"
        f"If you didn't request this, contact an admin."
    )

    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            if use_tls:
                smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False
