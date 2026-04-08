#!/usr/bin/env bash
set -euo pipefail

echo "[vercel-build] starting"
echo "[vercel-build] node: $(node -v)"
echo "[vercel-build] pnpm: $(pnpm -v)"

echo "[vercel-build] applying migrations (with retries)"
max_attempts=3
attempt=1

until pnpm exec prisma migrate deploy; do
  code=$?
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[vercel-build] prisma migrate deploy failed after ${attempt} attempts (exit ${code})"
    exit "$code"
  fi

  echo "[vercel-build] prisma migrate deploy failed on attempt ${attempt} (exit ${code}); retrying in 10s"
  attempt=$((attempt + 1))
  sleep 10
done

echo "[vercel-build] running application build"
pnpm run build

echo "[vercel-build] completed"
