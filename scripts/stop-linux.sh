#!/usr/bin/env bash
# Stop and remove the Prelegal container.
set -euo pipefail

CONTAINER="prelegal"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

echo "Prelegal stopped"
