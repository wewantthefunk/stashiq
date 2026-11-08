from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Item, User
from app.schemas import ItemCreate, ItemRead

router = APIRouter(prefix="/api/items", tags=["items"])


@router.get("", response_model=list[ItemRead])
def list_items(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    return db.query(Item).order_by(Item.name).all()


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    body: ItemCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    item = Item(name=body.name, category=body.category, sku=body.sku)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
