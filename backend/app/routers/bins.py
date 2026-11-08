import io
import os
from typing import Annotated

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Bin, BinContent, User
from app.schemas import BinCreate, BinDetail, BinSummary
from app.site_url import bin_deep_link

router = APIRouter(prefix="/api/bins", tags=["bins"])


@router.get("", response_model=list[BinSummary])
def list_bins(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    return db.query(Bin).order_by(Bin.id).all()


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
    bin_row = Bin(id=body.id, name=body.name, location_notes=body.location_notes)
    db.add(bin_row)
    db.commit()
    db.refresh(bin_row)
    return bin_row


@router.get("/{bin_id}", response_model=BinDetail)
def get_bin(
    bin_id: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    bin_row = (
        db.query(Bin)
        .options(joinedload(Bin.contents).joinedload(BinContent.item))
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
    return {
        "id": bin_row.id,
        "name": bin_row.name,
        "location_notes": bin_row.location_notes,
        "updated_at": bin_row.updated_at,
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
