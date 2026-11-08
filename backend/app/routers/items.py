from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Item, User
from app.schemas import ItemCreate, ItemRead, ItemUpdate

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


@router.patch("/{item_id}", response_model=ItemRead)
def update_item(
    item_id: UUID,
    body: ItemUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    if body.name is not None:
        item.name = body.name
    if body.category is not None:
        item.category = body.category
    if "sku" in body.model_fields_set:
        item.sku = body.sku or None

    db.commit()
    db.refresh(item)
    return item
