#!/usr/bin/env bash

GITLAB_URL="https://gitlab.com"
PROJECT_ID="74327754"
# The token that used to be hardcoded here was found live and revoked on
# 2026-08-04 -- it had full `api` scope and was sitting in plaintext.
TOKEN="${GITLAB_TOKEN:?Set GITLAB_TOKEN (a GitLab personal access token with api scope) before running this}"

# 1) Hole alle Issue IDs
issue_ids=$(curl --silent \
  --header "PRIVATE-TOKEN: $TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/issues?per_page=200" | jq -r '.[].iid')

# 2) Create a temporary worker file for parallel
worker=$(mktemp)

cat > "$worker" << 'EOF'
#!/usr/bin/env bash

GITLAB_URL="$1"
PROJECT_ID="$2"
TOKEN="$3"
iid="$4"

curl --silent \
  --header "PRIVATE-TOKEN: $TOKEN" \
  "$GITLAB_URL/api/v4/projects/$PROJECT_ID/issues/$iid/notes?per_page=100" \
| jq -r --arg iid "$iid" '
    if type == "array" then
      .[]
      | select(.body | test("added [0-9]+(h|m)"))
      | { user: .author.username, body: .body }
    else empty end
  '
EOF

chmod +x "$worker"

# 3) Parallel abfeuern
echo "$issue_ids" \
  | parallel -j 10 "$worker" "$GITLAB_URL" "$PROJECT_ID" "$TOKEN" {} \
  | jq -s '
      map(
        . + (
          .body
          | capture("added (?:(?<h>[0-9]+)h)? ?(?:(?<m>[0-9]+)m)?")
          | {
              hours: (
                (.h // "0" | tonumber)
                + ((.m // "0" | tonumber) / 60)
              )
            }
        )
      )
      | group_by(.user)
      | map({
          user: .[0].user,
          total_hours: (map(.hours) | add)
        })
      | sort_by(.user)
    '

# 4) Remove the worker
rm "$worker"
