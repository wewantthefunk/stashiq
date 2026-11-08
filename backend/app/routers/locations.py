from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_admin
from app.database import get_db
from app.models import Location, User
from app.schemas import LocationCreate, LocationRead

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead])
def list_locations(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    return db.query(Location).order_by(Location.id).all()


@router.post("", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    body: LocationCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    existing = db.get(Location, body.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Location id already exists",
        )
    row = Location(id=body.id, name=body.name, address=body.address)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
):
    row = db.get(Location, location_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    db.delete(row)
    db.commit()
