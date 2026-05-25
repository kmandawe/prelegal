#!/usr/bin/env bash
# Build and run the Prelegal container. Available at http://localhost:8000
set -euo pipefail

IMAGE="prelegal"
CONTAINER="prelegal"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker build -t "$IMAGE" .

ENV_ARGS=()
if [ -f .env ]; then
  ENV_ARGS+=(--env-file .env)
fi

docker run -d --name "$CONTAINER" -p 8000:8000 "${ENV_ARGS[@]}" "$IMAGE"

echo "Prelegal is starting at http://localhost:8000"
