from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, require_admin
from app.database import get_db
from app.email import send_invite_email
from app.invites import invite_url, issue_invite
from app.models import User
from app.schemas import (
    UserAdminCreate,
    UserCreatedResponse,
    UserListEntry,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/api/users", tags=["users"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.get("", response_model=list[UserListEntry])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    rows = db.query(User).order_by(User.username).all()
    return [UserListEntry.from_user(u) for u in rows]


@router.post("", response_model=UserCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserAdminCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    email = _normalize_email(str(body.email))
    existing = db.query(User).filter(User.username == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    user = User(
        username=email,
        password_hash=hash_password("pending"),
        role=body.role,
        password_set=False,
    )
    token = issue_invite(user)
    db.add(user)
    db.commit()
    db.refresh(user)

    link = invite_url(token)
    sent = send_invite_email(to_email=email, invite_url=link)
    return UserCreatedResponse(
        id=user.id,
        email=user.username,
        role=user.role,
        password_set=False,
        email_sent=sent,
        invite_url=None if sent else link,
    )


@router.post("/{user_id}/resend-invite", response_model=UserCreatedResponse)
def resend_invite(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.password_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has already set a password",
        )
    token = issue_invite(user)
    db.commit()
    db.refresh(user)
    link = invite_url(token)
    sent = send_invite_email(to_email=user.username, invite_url=link)
    return UserCreatedResponse(
        id=user.id,
        email=user.username,
        role=user.role,
        password_set=False,
        email_sent=sent,
        invite_url=None if sent else link,
    )


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(require_admin)],
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.role is not None:
        if user.id == actor.id and body.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot remove your own admin access",
            )
        if user.role == "admin" and body.role == "operator":
            admin_count = db.query(User).filter(User.role == "admin").count()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot demote the only admin",
                )
        user.role = body.role

    if body.password:
        user.password_hash = hash_password(body.password)
        user.password_set = True
        user.invite_token = None
        user.invite_token_expires = None

    if body.role is None and not body.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes provided",
        )

    db.commit()
    db.refresh(user)
    return UserRead.from_user(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    actor: Annotated[User, Depends(require_admin)],
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only admin",
            )

    db.delete(user)
    db.commit()
