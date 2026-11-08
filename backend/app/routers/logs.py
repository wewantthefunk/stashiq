from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Bin, InventoryLog, Item, User
from app.schemas import InventoryLogView

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=list[InventoryLogView])
def list_logs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    bin_id: Annotated[str | None, Query()] = None,
    user_id: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(le=500)] = 100,
):
    q = (
        db.query(InventoryLog, User.username, Item.name, Bin.name)
        .join(User, InventoryLog.user_id == User.id)
        .join(Item, InventoryLog.item_id == Item.id)
        .join(Bin, InventoryLog.bin_id == Bin.id)
        .order_by(InventoryLog.timestamp.desc())
    )
    if bin_id:
        q = q.filter(InventoryLog.bin_id == bin_id)
    if user_id:
        q = q.filter(InventoryLog.user_id == user_id)

    rows = q.limit(limit).all()
    return [
        InventoryLogView(
            id=log.id,
            bin_id=log.bin_id,
            bin_name=bin_name,
            item_id=log.item_id,
            item_name=item_name,
            user_id=log.user_id,
            username=username,
            change_amount=log.change_amount,
            previous_quantity=log.previous_quantity,
            new_quantity=log.new_quantity,
            notes=log.notes,
            timestamp=log.timestamp,
        )
        for log, username, item_name, bin_name in rows
    ]
