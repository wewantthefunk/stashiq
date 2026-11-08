from collections import Counter
from datetime import date, datetime, time, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Action, Bin, InventoryLog, Item, User
from app.schemas import ActionSummaryItem, InventoryLogView, UserActivityReport

router = APIRouter(prefix="/api/reports", tags=["reports"])

MAX_ROWS = 1000


def _log_rows_to_views(
    rows: list[tuple],
) -> list[InventoryLogView]:
    return [
        InventoryLogView(
            id=log.id,
            bin_id=log.bin_id,
            bin_name=bin_name or f"{log.bin_id} (removed)",
            action_id=log.action_id,
            action_name=(
                action_name
                if action_name
                else (
                    f"{log.action_id} (removed)"
                    if log.action_id
                    else None
                )
            ),
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
        for log, username, item_name, bin_name, action_name in rows
    ]


def _activity_query(
    db: Session,
    user_id: UUID,
    from_date: date | None,
    to_date: date | None,
):
    q = (
        db.query(InventoryLog, User.username, Item.name, Bin.name, Action.name)
        .join(User, InventoryLog.user_id == User.id)
        .join(Item, InventoryLog.item_id == Item.id)
        .outerjoin(Bin, InventoryLog.bin_id == Bin.id)
        .outerjoin(Action, InventoryLog.action_id == Action.id)
        .filter(InventoryLog.user_id == user_id)
        .order_by(InventoryLog.timestamp.desc())
    )
    if from_date is not None:
        start = datetime.combine(from_date, time.min)
        q = q.filter(InventoryLog.timestamp >= start)
    if to_date is not None:
        end_exclusive = datetime.combine(to_date, time.min) + timedelta(days=1)
        q = q.filter(InventoryLog.timestamp < end_exclusive)
    return q


@router.get("/user-activity", response_model=UserActivityReport)
def user_activity_report(
    user_id: Annotated[UUID, Query()],
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
    limit: Annotated[int, Query(le=MAX_ROWS)] = MAX_ROWS,
):
    if current.role != "admin" and user_id != current.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only view your own activity",
        )

    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'from' date must be on or before 'to' date",
        )

    q = _activity_query(db, user_id, from_date, to_date)
    rows = q.limit(limit).all()
    entries = _log_rows_to_views(rows)

    counts: Counter[str] = Counter()
    for entry in entries:
        label = entry.action_name or entry.action_id or "Unknown"
        counts[label] += 1

    action_summary = [
        ActionSummaryItem(action=name, count=count)
        for name, count in sorted(counts.items(), key=lambda x: (-x[1], x[0]))
    ]

    return UserActivityReport(
        user_id=target.id,
        username=target.username,
        from_date=from_date,
        to_date=to_date,
        action_summary=action_summary,
        entries=entries,
    )
