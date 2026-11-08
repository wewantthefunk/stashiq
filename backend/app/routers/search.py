from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Bin, BinContent, Item, User
from app.schemas import ItemBinSearchHit

router = APIRouter(prefix="/api/search", tags=["search"])

MIN_QUERY_LEN = 2


@router.get("/items", response_model=list[ItemBinSearchHit])
def search_items_in_bins(
    q: Annotated[str, Query(min_length=1)],
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    location_id: str | None = None,
):
    term = q.strip()
    if len(term) < MIN_QUERY_LEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Search term must be at least {MIN_QUERY_LEN} characters",
        )

    pattern = f"%{term}%"
    item_ids = [
        row[0]
        for row in db.query(Item.id)
        .filter(Item.name.ilike(pattern) | Item.category.ilike(pattern))
        .all()
    ]
    if not item_ids:
        return []

    rows = (
        db.query(BinContent)
        .options(
            joinedload(BinContent.bin).joinedload(Bin.location),
            joinedload(BinContent.item),
        )
        .filter(BinContent.item_id.in_(item_ids))
        .order_by(BinContent.bin_id)
        .all()
    )

    if location_id is not None:
        if location_id == "":
            rows = [r for r in rows if r.bin.location_id is None]
        else:
            rows = [r for r in rows if r.bin.location_id == location_id]

    return [
        ItemBinSearchHit(
            bin_id=row.bin_id,
            bin_name=row.bin.name,
            location_id=row.bin.location_id,
            location_name=row.bin.location.name if row.bin.location else None,
            item=row.item,
            quantity=row.quantity,
        )
        for row in rows
    ]
