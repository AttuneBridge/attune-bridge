#!/usr/bin/env bash
set -euo pipefail

echo "[vercel-build] starting"
echo "[vercel-build] node: $(node -v)"
echo "[vercel-build] pnpm: $(pnpm -v)"

run_with_timeout() {
  local seconds="$1"
  shift

  if command -v timeout >/dev/null 2>&1; then
    timeout "${seconds}s" "$@"
    return $?
  fi

  "$@"
}

echo "[vercel-build] checking migration status"
run_with_timeout 120 pnpm exec prisma migrate status || {
  code=$?
  echo "[vercel-build] prisma migrate status failed (exit ${code})"
  exit "$code"
}

echo "[vercel-build] applying migrations"
run_with_timeout 300 pnpm exec prisma migrate deploy || {
  code=$?
  if [ "$code" -eq 124 ]; then
    echo "[vercel-build] prisma migrate deploy timed out after 300s"
  else
    echo "[vercel-build] prisma migrate deploy failed (exit ${code})"
  fi
  exit "$code"
}

echo "[vercel-build] running application build"
pnpm run build

echo "[vercel-build] completed"
