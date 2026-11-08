import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, migrate_users_table
from app.routers import auth, bins, config, inventory, items, logs, search, users

app = FastAPI(
    title="StashIQ",
    description="Inventory tracking for Amazing Athletes equipment bins",
    version="0.1.0",
)

_cors_allow_all = os.getenv("CORS_ALLOW_ALL", "false").lower() in (
    "1",
    "true",
    "yes",
)
_cors_default = "http://localhost:3000,http://127.0.0.1:3000"
_cors_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", _cors_default).split(",") if o.strip()
]

if _cors_allow_all:
    # Dev / LAN: any origin can call the API (e.g. phone at :8001). Bearer auth, not cookies.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(bins.router)
app.include_router(items.router)
app.include_router(inventory.router)
app.include_router(logs.router)
app.include_router(config.router)
app.include_router(search.router)
app.include_router(users.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    migrate_users_table()


@app.get("/health")
def health():
    return {"status": "ok"}
