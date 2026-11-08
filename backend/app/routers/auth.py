from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.email import send_password_reset_email
from app.invites import find_user_by_invite, invite_url, issue_invite
from app.models import User
from app.schemas import (
    AcceptInviteRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    InviteVerifyResponse,
    Token,
    UserCreate,
    UserRead,
)

_FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, we sent a link to set a new password."
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.get("/me", response_model=UserRead)
def read_current_user(
    user: Annotated[User, Depends(get_current_user)],
):
    return UserRead.from_user(user)


@router.get("/invite", response_model=InviteVerifyResponse)
def verify_invite(
    token: Annotated[str, Query(min_length=10)],
    db: Annotated[Session, Depends(get_db)],
):
    user = find_user_by_invite(db, token)
    if user is None:
        return InviteVerifyResponse(email="", valid=False)
    return InviteVerifyResponse(email=user.username, valid=True)


@router.post("/invite/accept", response_model=Token)
def accept_invite(
    body: AcceptInviteRequest,
    db: Annotated[Session, Depends(get_db)],
):
    user = find_user_by_invite(db, body.token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite link is invalid or expired",
        )
    user.password_hash = hash_password(body.password)
    user.password_set = True
    user.invite_token = None
    user.invite_token_expires = None
    db.commit()
    token = create_access_token(
        user_id=user.id, username=user.username, role=user.role
    )
    return Token(access_token=token)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
):
    """Bootstrap: create first admin with email + password (prefer Admin → Users in production)."""
    from pydantic import EmailStr, TypeAdapter

    try:
        email = _normalize_email(str(TypeAdapter(EmailStr).validate_python(body.username)))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A valid email address is required",
        )
    existing = db.query(User).filter(User.username == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        username=email,
        password_hash=hash_password(body.password),
        role=body.role,
        password_set=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(
        user_id=user.id, username=user.username, role=user.role
    )
    return Token(access_token=token)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not user.password_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your invite before changing your password",
        )
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        )
    user.password_hash = hash_password(body.new_password)
    db.commit()


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    body: ForgotPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
):
    email = _normalize_email(str(body.email))
    user = db.query(User).filter(User.username == email).first()
    if user is None:
        return ForgotPasswordResponse(message=_FORGOT_PASSWORD_MESSAGE)

    token = issue_invite(user)
    db.commit()
    link = invite_url(token)
    send_password_reset_email(to_email=email, reset_url=link)
    return ForgotPasswordResponse(message=_FORGOT_PASSWORD_MESSAGE)


@router.post("/login", response_model=Token)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    email = _normalize_email(form.username)
    user = db.query(User).filter(User.username == email).first()
    if user is None or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.password_set:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Set your password using the invite link sent to your email",
        )
    token = create_access_token(
        user_id=user.id, username=user.username, role=user.role
    )
    return Token(access_token=token)
