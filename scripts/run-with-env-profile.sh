#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: scripts/run-with-env-profile.sh <profile> <command> [args...]" >&2
  echo "Profiles: local, development, production-local, vercel-development, vercel-production" >&2
  exit 1
fi

PROFILE="$1"
shift

case "$PROFILE" in
  local)
    ENV_FILE=".env.local"
    ;;
  development)
    ENV_FILE=".env.development.local"
    ;;
  production-local)
    ENV_FILE=".env.production.local"
    ;;
  vercel-development)
    ENV_FILE=".env.vercel.development"
    ;;
  vercel-production)
    ENV_FILE=".env.vercel.production"
    ;;
  *)
    echo "Unknown profile '$PROFILE'" >&2
    exit 1
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found for profile '$PROFILE': $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ "${1:-}" = "pnpm" ] && [ "${2:-}" = "exec" ] && [ "${3:-}" = "prisma" ]; then
  for REQUIRED_KEY in DATABASE_URL DIRECT_URL; do
    if [ -z "${!REQUIRED_KEY:-}" ]; then
      echo "Missing required env var '$REQUIRED_KEY' in profile '$PROFILE' ($ENV_FILE)" >&2
      exit 1
    fi
  done
fi

exec "$@"
