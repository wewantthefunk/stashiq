#!/usr/bin/env bash
# Start StashIQ with the host's current LAN IP in FRONTEND_BASE_URL (for phones on Wi‑Fi).
# Usage: ./scripts/compose-up.sh [docker compose args…]   e.g.  ./scripts/compose-up.sh up --build -d
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

ENV_FILE="${ROOT}/.env"
touch "${ENV_FILE}"

remove_env_key() {
  local key="$1"
  local tmp
  tmp="$(mktemp)"
  grep -v "^${key}=" "${ENV_FILE}" >"${tmp}" 2>/dev/null || true
  mv "${tmp}" "${ENV_FILE}"
}

merge_env() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"
  if grep -q "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    awk -v k="${key}" -v v="${value}" '
      $0 ~ "^" k "=" { print k "=" v; next }
      { print }
    ' "${ENV_FILE}" >"${tmp}"
  else
    cat "${ENV_FILE}" >"${tmp}"
    echo "${key}=${value}" >>"${tmp}"
  fi
  mv "${tmp}" "${ENV_FILE}"
}

if [[ "${STASHIQ_LOCALHOST_ONLY:-0}" == "1" ]]; then
  echo "STASHIQ_LOCALHOST_ONLY=1 — not updating LAN URLs in .env"
else
  IP="$("${ROOT}/scripts/detect-lan-ip.sh")"
  FRONTEND_PORT="$(grep -E '^FRONTEND_HOST_PORT=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- || true)"
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"
  BACKEND_PORT="$(grep -E '^BACKEND_HOST_PORT=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- || true)"
  BACKEND_PORT="${BACKEND_PORT:-8001}"

  merge_env "LAN_IP" "${IP}"
  merge_env "FRONTEND_BASE_URL" "http://${IP}:${FRONTEND_PORT}"

  cors="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT},http://${IP}:${FRONTEND_PORT}"
  public_url="$(grep -E '^PUBLIC_URL=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
  if [[ -n "${public_url}" ]]; then
    if [[ "${public_url}" != http* ]]; then
      public_url="https://${public_url}"
    fi
    cors="${cors},${public_url}"
  fi
  merge_env "CORS_ORIGINS" "${cors}"
  merge_env "VITE_PROXY_TARGET" "http://backend:8000"
  merge_env "CORS_ALLOW_ALL" "true"
  merge_env "VITE_DISABLE_HMR" "1"
  merge_env "VITE_HMR_HOST" "${IP}"
  remove_env_key "VITE_API_URL"

  echo ""
  echo "LAN access:  http://${IP}:${FRONTEND_PORT}"
  echo "API (host): http://localhost:${BACKEND_PORT}"
  echo ""
  echo "If your phone shows ERR_TOO_MANY_RETRIES or 'can't be reached':"
  echo "  1. Run: sudo ./scripts/open-lan-firewall.sh"
  echo "  2. Same Wi-Fi (not guest); router 'AP isolation' must be OFF"
  echo "  3. Use http:// (not https://) in Chrome"
fi

exec docker compose -f docker-compose.yml -f docker-compose.dev-bind.yml "$@"
