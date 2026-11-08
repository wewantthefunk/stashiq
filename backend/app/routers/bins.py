import io
import os
from typing import Annotated

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Bin, BinContent, Location, User
from app.schemas import BinCreate, BinDetail, BinSummary, BinUpdate, LocationRead
from app.site_url import bin_deep_link

router = APIRouter(prefix="/api/bins", tags=["bins"])


def _bin_has_stock(db: Session, bin_id: str) -> bool:
    row = (
        db.query(BinContent.id)
        .filter(BinContent.bin_id == bin_id, BinContent.quantity > 0)
        .first()
    )
    return row is not None


def _bin_summary(bin_row: Bin, *, is_empty: bool) -> dict:
    loc = bin_row.location
    return {
        "id": bin_row.id,
        "name": bin_row.name,
        "location_notes": bin_row.location_notes,
        "location_id": bin_row.location_id,
        "location": LocationRead.model_validate(loc) if loc else None,
        "updated_at": bin_row.updated_at,
        "is_empty": is_empty,
    }


@router.get("", response_model=list[BinSummary])
def list_bins(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    location_id: str | None = Query(default=None),
):
    q = db.query(Bin).options(joinedload(Bin.location)).order_by(Bin.id)
    if location_id is not None:
        if location_id == "":
            q = q.filter(Bin.location_id.is_(None))
        else:
            q = q.filter(Bin.location_id == location_id)
    rows = q.all()
    stocked_ids = {
        row[0]
        for row in db.query(BinContent.bin_id)
        .filter(BinContent.quantity > 0)
        .distinct()
        .all()
    }
    return [
        _bin_summary(b, is_empty=b.id not in stocked_ids) for b in rows
    ]


@router.post("", response_model=BinSummary, status_code=status.HTTP_201_CREATED)
def create_bin(
    body: BinCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    existing = db.get(Bin, body.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bin id already exists",
        )
    if body.location_id is not None and db.get(Location, body.location_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    bin_row = Bin(
        id=body.id,
        name=body.name,
        location_notes=body.location_notes,
        location_id=body.location_id,
    )
    db.add(bin_row)
    db.commit()
    db.refresh(bin_row)
    return _bin_summary(bin_row, is_empty=True)


@router.delete("/{bin_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bin(
    bin_id: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    bin_row = db.get(Bin, bin_id)
    if bin_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")

    if _bin_has_stock(db, bin_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bin must be empty before it can be removed. Adjust all counts to zero first.",
        )

    db.delete(bin_row)
    db.commit()


@router.patch("/{bin_id}", response_model=BinSummary)
def update_bin(
    bin_id: str,
    body: BinUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    bin_row = db.get(Bin, bin_id)
    if bin_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")

    if "location_id" in body.model_fields_set:
        lid = body.location_id
        if lid is None or lid == "":
            bin_row.location_id = None
        elif db.get(Location, lid) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )
        else:
            bin_row.location_id = lid

    if body.name is not None:
        bin_row.name = body.name
    if body.location_notes is not None:
        bin_row.location_notes = body.location_notes or None

    db.commit()
    db.refresh(bin_row)
    if bin_row.location_id:
        db.refresh(bin_row, attribute_names=["location"])
    is_empty = not _bin_has_stock(db, bin_id)
    return _bin_summary(bin_row, is_empty=is_empty)


@router.get("/{bin_id}", response_model=BinDetail)
def get_bin(
    bin_id: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    bin_row = (
        db.query(Bin)
        .options(
            joinedload(Bin.location),
            joinedload(Bin.contents).joinedload(BinContent.item),
        )
        .filter(Bin.id == bin_id)
        .first()
    )
    if bin_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")

    contents = [
        {
            "item": c.item,
            "quantity": c.quantity,
            "updated_at": c.updated_at,
        }
        for c in bin_row.contents
    ]
    loc = bin_row.location
    is_empty = not any(c.quantity > 0 for c in bin_row.contents)
    return {
        "id": bin_row.id,
        "name": bin_row.name,
        "location_notes": bin_row.location_notes,
        "location_id": bin_row.location_id,
        "location": LocationRead.model_validate(loc) if loc else None,
        "updated_at": bin_row.updated_at,
        "is_empty": is_empty,
        "contents": contents,
    }


@router.get("/{bin_id}/qr")
def bin_qr_code(
    bin_id: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    bin_row = db.get(Bin, bin_id)
    if bin_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bin not found")

    url = bin_deep_link(bin_id)
    img = qrcode.make(url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png")
