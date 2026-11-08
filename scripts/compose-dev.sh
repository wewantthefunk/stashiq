#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "${ROOT}/scripts/compose-up.sh" -f docker-compose.yml -f docker-compose.dev.yml "$@"
