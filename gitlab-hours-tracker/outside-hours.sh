#!/usr/bin/env bash
set -euo pipefail

GITLAB_URL="https://gitlab.com"
PROJECT_ID="74327754"
# The token that used to be hardcoded here was found live and revoked on
# 2026-08-04 -- it had full `api` scope and was sitting in plaintext.
TOKEN="${GITLAB_TOKEN:?Set GITLAB_TOKEN (a GitLab personal access token with api scope) before running this}"

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: GITLAB_TOKEN nicht gesetzt"
  exit 1
fi

api_call() {
  local url="$1"

  response=$(curl --silent --show-error \
    --header "PRIVATE-TOKEN: $TOKEN" \
    --write-out "\n%{http_code}" \
    "$url")

  body=$(echo "$response" | sed '$d')
  status=$(echo "$response" | tail -n1)

  if [[ "$status" != "200" ]]; then
    echo "API ERROR ($status):"
    echo "$body"
    exit 1
  fi

  echo "$body"
}

is_outside_window() {
  local iso="$1"

  day=$(date -u -d "$iso" +%u)
  hour=$(date -u -d "$iso" +%H)
  min=$(date -u -d "$iso" +%M)

  if [[ "$day" -ne 3 ]]; then
    return 0
  fi

  total=$((10#$hour * 60 + 10#$min))
  start=$((14 * 60 + 10))
  end=$((16 * 60 + 50))

  if (( total < start || total > end )); then
    return 0
  else
    return 1
  fi
}

echo "==== COMMITS außerhalb Mittwoch 14:10–16:50 ===="
page=1
outside_commits=0

while :; do
  body=$(api_call "$GITLAB_URL/api/v4/projects/$PROJECT_ID/repository/commits?per_page=100&page=$page")

  count=$(echo "$body" | jq 'length')

  [[ "$count" -eq 0 ]] && break

  echo "$body" | jq -c '.[]' | while read -r commit; do
    date=$(echo "$commit" | jq -r '.committed_date')
    title=$(echo "$commit" | jq -r '.title')
    author=$(echo "$commit" | jq -r '.author_name')

    if is_outside_window "$date"; then
      echo "$date | $author | $title"
      ((outside_commits++))
    fi
  done

  ((page++))
done

echo "Commits außerhalb: $outside_commits"
