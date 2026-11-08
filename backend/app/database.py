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


def migrate_bins_table() -> None:
    """Add location_id on bins for existing deployments."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "bins" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("bins")}
    if "location_id" in existing:
        return

    with engine.begin() as conn:
        if DATABASE_URL.startswith("sqlite"):
            conn.execute(text("ALTER TABLE bins ADD COLUMN location_id VARCHAR(32)"))
        else:
            conn.execute(
                text(
                    "ALTER TABLE bins ADD COLUMN location_id VARCHAR(32) "
                    "REFERENCES locations(id) ON DELETE SET NULL"
                )
            )


def migrate_inventory_logs_add_action_id() -> None:
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "inventory_logs" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("inventory_logs")}
    if "action_id" in existing:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE inventory_logs ADD COLUMN action_id VARCHAR(32)"))


def migrate_inventory_logs_drop_bin_fk() -> None:
    """Allow deleting bins while retaining audit rows (bin_id stays as text)."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "inventory_logs" not in insp.get_table_names():
        return

    if DATABASE_URL.startswith("sqlite"):
        # Fresh SQLite tests use create_all without FK; nothing to do.
        fks = insp.get_foreign_keys("inventory_logs")
        if not any(fk.get("referred_table") == "bins" for fk in fks):
            return
        # SQLite: recreate without FK is heavy; tests drop_all each run.
        return

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                WHERE rel.relname = 'inventory_logs'
                  AND con.contype = 'f'
                  AND con.conname LIKE '%bin_id%'
                """
            )
        ).fetchall()
        for (name,) in rows:
            conn.execute(text(f'ALTER TABLE inventory_logs DROP CONSTRAINT "{name}"'))
        conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
