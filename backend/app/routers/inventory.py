from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Bin, BinContent, InventoryLog, Item, User
from app.schemas import BinContentRead, InventoryAdjust

router = APIRouter(prefix="/api/bins", tags=["inventory"])


@router.post("/{bin_id}/adjust", response_model=BinContentRead)
def adjust_inventory(
    bin_id: str,
    body: InventoryAdjust,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    bin_row = db.get(Bin, bin_id)
    if bin_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")

    item = db.get(Item, body.item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    content = (
        db.query(BinContent)
        .filter(BinContent.bin_id == bin_id, BinContent.item_id == body.item_id)
        .first()
    )
    previous = content.quantity if content else 0
    new_qty = previous + body.change_amount
    if new_qty < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity cannot drop below zero",
        )

    if content is None:
        content = BinContent(bin_id=bin_id, item_id=body.item_id, quantity=new_qty)
        db.add(content)
    else:
        content.quantity = new_qty
        content.updated_at = datetime.utcnow()

    log = InventoryLog(
        bin_id=bin_id,
        item_id=body.item_id,
        user_id=user.id,
        change_amount=body.change_amount,
        previous_quantity=previous,
        new_quantity=new_qty,
        notes=body.notes,
    )
    db.add(log)
    bin_row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(content)
    db.refresh(content, attribute_names=["item"])

    return {
        "item": content.item,
        "quantity": content.quantity,
        "updated_at": content.updated_at,
    }
