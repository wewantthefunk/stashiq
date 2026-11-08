#!/usr/bin/env bash
# Allow phones on the LAN to reach StashIQ on ports 3000 and 8001 (must run as root).
set -euo pipefail

FRONTEND_PORT="${FRONTEND_HOST_PORT:-3000}"
BACKEND_PORT="${BACKEND_HOST_PORT:-8001}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo:  sudo $0" >&2
  exit 1
fi

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "${FRONTEND_PORT}/tcp" comment "StashIQ frontend"
  ufw allow "${BACKEND_PORT}/tcp" comment "StashIQ API (optional)"
  ufw status | grep -E "${FRONTEND_PORT}|${BACKEND_PORT}|StashIQ" || ufw status
  echo "UFW updated."
elif command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --add-port="${FRONTEND_PORT}/tcp" --permanent
  firewall-cmd --add-port="${BACKEND_PORT}/tcp" --permanent
  firewall-cmd --reload
  echo "firewalld updated."
else
  echo "No active ufw/firewalld detected. If the phone still cannot connect, check your router"
  echo "for 'client isolation' / 'AP isolation' and disable it for testing."
fi
