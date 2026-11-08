# StashIQ

Inventory tracking for **Amazing Athletes** youth sports instruction: equipment bins, stock levels, QR labels for quick bin access, and audit logs for every adjustment.

## Stack

- **Backend:** Python 3.11, FastAPI, SQLAlchemy, JWT auth
- **Frontend:** React, Vite, Tailwind, in-browser QR scanning (`html5-qrcode`)
- **Database:** PostgreSQL 16
- **Containers:** Docker Compose

## Quick start

```bash
cp .env.example .env   # optional
./scripts/compose-up.sh up --build
```

## Production (Docker + Cloudflare Tunnel)

Self-hosted example: app on **192.168.1.6**, public URL **`https://stashiq.wewantthefunk.top`**, `cloudflared` on the same machine proxying to the frontend.

1. Copy and edit `.env` — set `JWT_SECRET`, `POSTGRES_PASSWORD`, `PUBLIC_URL`, `FRONTEND_BASE_URL`, `CORS_ALLOW_ALL=false`, `CORS_ORIGINS`, and `SMTP_*`. See the production block in `.env.example`.

2. Start with the **prod** overlay (no source bind mounts, no uvicorn reload):

   ```bash
   chmod +x ./scripts/compose-prod.sh
   ./scripts/compose-prod.sh up --build -d
   ```

3. Point the tunnel at the app (only port **3000**):

   ```yaml
   ingress:
     - hostname: stashiq.wewantthefunk.top
       service: http://127.0.0.1:3000
     - service: http_status:404
   ```

4. Bootstrap the first admin (with backend on localhost only):

   ```bash
   curl -X POST "http://127.0.0.1:8001/api/auth/register" \
     -H "Content-Type: application/json" \
     -d '{"username":"you@yourorg.com","password":"STRONG","role":"admin"}'
   ```

Do **not** use `./scripts/compose-up.sh` on the production host — it overwrites URLs for LAN dev.

Updates: `git pull && ./scripts/compose-prod.sh up --build -d`

`compose-up.sh` detects this machine's LAN IP (e.g. `192.168.1.11`) and writes `FRONTEND_BASE_URL` / CORS in `.env` before starting Docker. Run it again when you change networks so phones always get the right URL.

Default **host** ports (override in `.env`):

| Service  | URL |
|----------|-----|
| Coach app | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:8001](http://localhost:8001) (mapped from container `8000`) |
| Postgres | `localhost:5433` |

- OpenAPI docs: `http://localhost:8001/docs`
- Health: `GET /health`

### Port already in use?

If you see `Bind for 0.0.0.0:8000 failed: port is already allocated`, another app (often another Docker project) is using that port. StashIQ defaults to **8001** and **5433** on the host so it can run beside other stacks. Copy `.env.example` to `.env` or set `BACKEND_HOST_PORT` / `DB_HOST_PORT` yourself.

```bash
docker compose down
docker compose up --build
```

### First user

Register an admin or operator (handy for dev; tighten or remove in production):

```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme","role":"admin"}'
```

Log in with form data at `POST /api/auth/login` (`username`, `password`) to receive a JWT.

Set **`PUBLIC_URL`** in `.env` for bin QR codes (e.g. `https://stashiq-test.wewantthefunk.top`). This overrides `FRONTEND_BASE_URL` for deep links. `FRONTEND_BASE_URL` stays for local/LAN access. Print from **Admin → Bins → Label** or `/bins/{id}/label`.

### Frontend only (local dev)

```bash
cd frontend
cp .env.example .env   # optional
npm install
npm run dev
```

Vite proxies `/api` to the backend; you usually do **not** need `VITE_API_URL`.

### Use from your phone (same Wi‑Fi)

Your phone (e.g. `192.168.1.5`) must open the **laptop’s LAN IP**, not `localhost`. API calls go through port **3000** only (Vite proxy).

```bash
./scripts/compose-up.sh up --build -d
```

On the phone, open the URL printed by the script (e.g. `http://192.168.1.11:3000`). In the app: **Admin → Mobile** for the current link, QR, and copy button.

Override detection: `STASHIQ_LAN_IP=192.168.1.11 ./scripts/compose-up.sh up -d`. Laptop-only (no LAN rewrite): `STASHIQ_LOCALHOST_ONLY=1 docker compose up`.

Manual IP check: `./scripts/detect-lan-ip.sh`

**If the page won’t load:** allow port **3000** through the laptop firewall. **Not CORS?** When you use `http://<lan-ip>:3000`, the browser talks to `/api` on the **same** host, so CORS usually does not apply. If login still fails, check that `.env` has **no** `VITE_API_URL` (remove it and rerun `compose-up.sh`). Dev API CORS is wide open by default (`CORS_ALLOW_ALL=true`) for LAN testing.

**Phone shows `ERR_TOO_MANY_RETRIES` or “This site can’t be reached”** — this is almost never CORS.

1. **Firewall on the laptop** (UFW is often the culprit):

   ```bash
   sudo ./scripts/open-lan-firewall.sh
   ```

2. **Use plain HTTP:** `http://192.168.1.11:3000` — not `https://`.

3. **Router:** turn off **AP / client isolation** on Wi‑Fi; guest networks often block device-to-device traffic.

4. **Stable frontend for phones:** default `compose-up.sh` serves a **production build** via `vite preview` (no dev WebSocket reload loop). For hot reload on the laptop only: `./scripts/compose-dev.sh up`.

5. **Quick test from the phone:** open `http://<laptop-ip>:3000/health` — you should see `{"status":"ok"}`. If that fails, the phone never reaches the laptop (firewall or Wi‑Fi isolation).

**Camera / QR:** allow browser camera access; some devices are picky about HTTP on a LAN IP.

**Register the first user from the laptop:**

```bash
curl -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme","role":"admin"}'
```

Then sign in on the phone with the same credentials.

## Tests

From the repo root with only Python dependencies installed:

```bash
cd backend
pip install -r requirements.txt
pytest
```

Tests use an in-memory SQLite database by default. To run against PostgreSQL:

```bash
TEST_DATABASE_URL=postgresql://stashiq:stashiq@localhost:5432/stashiq pytest
```

Or inside the backend container:

```bash
docker compose run --rm backend pytest
```

## Project layout

```
stashiq/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── routers/   # auth, locations, bins, items, inventory, logs
│   │   └── ...
│   └── tests/
└── frontend/          # React coach UI (login, scan, bin stock)
```

## API overview

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/login`, `GET/POST /api/auth/invite`, `POST /api/auth/change-password`, `POST /api/auth/forgot-password`, `GET /api/auth/me` |
| Users | `GET/POST /api/users`, `POST /api/users/{id}/resend-invite`, `PATCH/DELETE /api/users/{id}` (admin) |
| Locations | `GET/POST /api/locations`, `DELETE /api/locations/{id}` |
| Bins | `GET/POST /api/bins`, `PATCH/DELETE /api/bins/{id}`, `GET /api/bins/{id}`, `GET /api/bins/{id}/qr` (`?location_id=` on list; delete requires empty bin) |
| Items | `GET/POST /api/items` |
| Actions | `GET/POST /api/actions`, `DELETE /api/actions/{id}` |
| Inventory | `POST /api/bins/{id}/adjust` (requires `action_id`) |
| Logs | `GET /api/logs?bin_id=&user_id=` |

New users are invited by **email** (no password on create). They open `/welcome?token=…` from the invite link, set a password, and sign in. Configure `SMTP_*` in `.env` to send invites automatically; otherwise the admin UI shows a copyable link.

Signed-in users can change password under **Account**. **Forgot password** always responds with a generic message (never returns a reset link). When the account exists, the password is rotated and an email is sent if SMTP is configured. Without SMTP, users need an admin **Resend invite** to obtain a link manually.

All routes except login, forgot-password, invite verify/accept, and health require `Authorization: Bearer <token>`.
