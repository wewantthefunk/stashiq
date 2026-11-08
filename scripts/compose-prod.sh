#!/usr/bin/env bash
# Production Docker Compose (no LAN rewrite — use .env for PUBLIC_URL, CORS, secrets).
# Usage: ./scripts/compose-prod.sh up --build -d
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f "${ROOT}/.env" ]]; then
  echo "Missing .env — copy .env.example and set JWT_SECRET, POSTGRES_PASSWORD, PUBLIC_URL, SMTP." >&2
  exit 1
fi

if grep -qE '^JWT_SECRET=dev-change-me-in-production$' "${ROOT}/.env" 2>/dev/null \
  || grep -qE '^JWT_SECRET=$' "${ROOT}/.env" 2>/dev/null; then
  echo "Warning: set a strong JWT_SECRET in .env before production." >&2
fi

exec docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
