import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://stashiq:stashiq@localhost:5432/stashiq",
)

connect_args = {}
poolclass = None
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    if DATABASE_URL in ("sqlite://", "sqlite:///:memory:"):
        poolclass = StaticPool

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    poolclass=poolclass,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def migrate_users_table() -> None:
    """Add invite columns for existing Postgres/SQLite deployments (create_all is not ALTER)."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("users")}
    alters: list[str] = []
    if "password_set" not in existing:
        alters.append(
            "ADD COLUMN password_set BOOLEAN NOT NULL DEFAULT TRUE"
            if not DATABASE_URL.startswith("sqlite")
            else "ADD COLUMN password_set BOOLEAN NOT NULL DEFAULT 1"
        )
    if "invite_token" not in existing:
        alters.append("ADD COLUMN invite_token VARCHAR(128)")
    if "invite_token_expires" not in existing:
        alters.append("ADD COLUMN invite_token_expires TIMESTAMP")

    if not alters:
        return

    with engine.begin() as conn:
        for clause in alters:
            conn.execute(text(f"ALTER TABLE users {clause}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
