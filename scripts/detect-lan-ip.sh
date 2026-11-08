#!/usr/bin/env bash
# Prints the host's primary IPv4 address on the local network (Wi‑Fi / Ethernet).
set -euo pipefail

if [[ -n "${STASHIQ_LAN_IP:-}" ]]; then
  echo "${STASHIQ_LAN_IP}"
  exit 0
fi

ip=""

if command -v ip >/dev/null 2>&1; then
  ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") print $(i + 1); exit}')"
fi

if [[ -z "${ip}" ]] && command -v hostname >/dev/null 2>&1; then
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

if [[ -z "${ip}" ]] && command -v python3 >/dev/null 2>&1; then
  ip="$(python3 - <<'PY'
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    s.connect(("8.8.8.8", 80))
    print(s.getsockname()[0])
finally:
    s.close()
PY
)"
fi

if [[ -z "${ip}" ]]; then
  echo "Could not detect LAN IP" >&2
  exit 1
fi

echo "${ip}"
