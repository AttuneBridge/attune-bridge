#!/usr/bin/env bash
set -euo pipefail

# Required:
#   CRON_SECRET         Shared secret for /api/cron/loyalty/process
#
# Optional:
#   APP_BASE_URL        Base URL for deployed app (default: NEXT_PUBLIC_APP_URL, then localhost)
#   LIMIT_PER_BUSINESS  Max due messages per business per run (default: 25)

APP_BASE_URL="${APP_BASE_URL:-${NEXT_PUBLIC_APP_URL:-http://localhost:3000}}"
LIMIT_PER_BUSINESS="${LIMIT_PER_BUSINESS:-25}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "ERROR: CRON_SECRET is required" >&2
  exit 1
fi

URL="${APP_BASE_URL%/}/api/cron/loyalty/process"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Running loyalty queue processor"
echo "POST ${URL} (limitPerBusiness=${LIMIT_PER_BUSINESS})"

curl --fail --silent --show-error \
  -X POST "${URL}" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  --data "{\"limitPerBusiness\": ${LIMIT_PER_BUSINESS}}"

echo
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Loyalty queue processor finished"
