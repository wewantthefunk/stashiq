#!/usr/bin/env bash
# Legacy helper — runs detect-lan-ip and refreshes .env (same as compose-up's LAN step).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STASHIQ_LAN_IP=""
export STASHIQ_LAN_IP="$("${ROOT}/scripts/detect-lan-ip.sh")"
echo "Detected LAN IP: ${STASHIQ_LAN_IP}"
echo "Run:  ${ROOT}/scripts/compose-up.sh up --build -d"
