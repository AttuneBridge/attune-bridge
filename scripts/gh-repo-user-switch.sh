#!/usr/bin/env bash

set -euo pipefail

origin_url="$(git remote get-url origin 2>/dev/null || true)"

if [[ -z "${origin_url}" ]]; then
  printf 'No origin remote found.\n' >&2
  exit 1
fi

owner=""

if [[ "${origin_url}" =~ github.com[:/]([^/]+)/[^/]+(\.git)?$ ]]; then
  owner="${BASH_REMATCH[1]}"
fi

if [[ -z "${owner}" ]]; then
  printf 'Could not parse GitHub owner from origin: %s\n' "${origin_url}" >&2
  exit 1
fi

target_user=""

case "${owner}" in
  AttuneBridge)
    target_user="jacobnlangley"
    ;;
  fullh3art)
    target_user="fullh3art"
    ;;
  jacobnlangley)
    target_user="jacobnlangley"
    ;;
  *)
    printf 'No account mapping configured for owner: %s\n' "${owner}" >&2
    printf 'Add a mapping in scripts/gh-repo-user-switch.sh if this is expected.\n' >&2
    exit 1
    ;;
esac

gh auth switch -u "${target_user}" >/dev/null

active_user="$(gh api user --jq .login 2>/dev/null || true)"

if [[ "${active_user}" != "${target_user}" ]]; then
  printf 'Failed to switch to expected gh user. expected=%s active=%s\n' "${target_user}" "${active_user}" >&2
  exit 1
fi

printf 'gh account ready: %s (repo owner: %s)\n' "${active_user}" "${owner}"
