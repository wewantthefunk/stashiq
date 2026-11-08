import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import User


def invite_expiry() -> datetime:
    days = 7
    return datetime.utcnow() + timedelta(days=days)


def new_invite_token() -> str:
    return secrets.token_urlsafe(32)


def issue_invite(user: User) -> str:
    token = new_invite_token()
    user.invite_token = token
    user.invite_token_expires = invite_expiry()
    user.password_set = False
    user.password_hash = hash_password(secrets.token_urlsafe(24))
    return token


def invite_url(token: str) -> str:
    from app.site_url import public_site_url

    base = public_site_url()
    return f"{base}/welcome?token={token}"


def find_user_by_invite(db: Session, token: str) -> User | None:
    if not token.strip():
        return None
    user = db.query(User).filter(User.invite_token == token.strip()).first()
    if user is None:
        return None
    if user.invite_token_expires is None or user.invite_token_expires < datetime.utcnow():
        return None
    return user
