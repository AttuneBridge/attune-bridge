#!/usr/bin/env bash

set -euo pipefail

if [[ "${VERCEL_ENV:-}" == "preview" ]]; then
  printf 'Skipping Vercel preview deployment for ref %s\n' "${VERCEL_GIT_COMMIT_REF:-unknown}"
  exit 0
fi

printf 'Allowing Vercel production deployment for ref %s\n' "${VERCEL_GIT_COMMIT_REF:-unknown}"
exit 1
