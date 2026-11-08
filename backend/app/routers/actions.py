from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Action, User
from app.schemas import ActionCreate, ActionRead

router = APIRouter(prefix="/api/actions", tags=["actions"])


@router.get("", response_model=list[ActionRead])
def list_actions(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    return db.query(Action).order_by(Action.id).all()


@router.post("", response_model=ActionRead, status_code=status.HTTP_201_CREATED)
def create_action(
    body: ActionCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    existing = db.get(Action, body.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Action id already exists",
        )
    row = Action(id=body.id, name=body.name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action(
    action_id: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    row = db.get(Action, action_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action not found",
        )
    db.delete(row)
    db.commit()
