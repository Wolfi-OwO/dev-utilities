# hours-getter-gitlab

Two standalone bash scripts that pull time-tracking data out of a single
GitLab project (via the GitLab REST API) for accountability/reporting
purposes.

## What's here

### `hours-getter.sh` — sum logged time per user

Aggregates GitLab's built-in time-tracking entries (the notes GitLab posts
automatically when someone runs `/spend` on an issue, e.g. "added 2h 30m of
time spent") across every issue in the project, and totals them per user.

How it works:

1. Fetches all issue IDs for the project (`GET /issues?per_page=200`).
2. Spins up a temporary worker script and runs it in parallel (`GNU parallel
   -j 10`) over every issue. Each worker fetches that issue's notes (`GET
   /issues/:iid/notes?per_page=100`) and keeps only notes whose body matches
   `added [0-9]+(h|m)`.
3. Parses the `h`/`m` values out of each matching note, converts everything
   to decimal hours, groups by GitLab username, and sums.
4. Prints a JSON array to stdout:
   ```json
   [
     { "user": "someuser", "total_hours": 12.5 }
   ]
   ```

### `outside-hours.sh` — flag commits outside a fixed weekly window

Walks every commit on the project (paginated, `GET
/repository/commits?per_page=100`) and prints the ones whose commit
timestamp falls outside **Wednesday 14:10–16:50 UTC** — a hardcoded
window, presumably the officially sanctioned working slot the hours are
meant to be logged against. For each such commit it prints `date | author |
title`, and at the end prints a total count of commits found outside the
window.

## Requirements

- `bash`, `curl`, `jq`
- `hours-getter.sh` additionally needs GNU `parallel`
- GNU `date` (used with `-d`; the script assumes GNU coreutils date, not
  BSD/macOS date)

## Configuration

Both scripts currently have the GitLab instance, project ID, and a GitLab
**Personal Access Token hardcoded at the top of the file** (`GITLAB_URL`,
`PROJECT_ID`, `TOKEN`). There are no command-line arguments or environment
variables to override them — edit the script directly to point it at a
different project or token.

## Running

```bash
./hours-getter.sh
./outside-hours.sh
```

Both just print to stdout; there's no file output or flags.

## Caveats / known issues

- **The GitLab token is committed in plaintext in both scripts, in the
  clear, right now.** This is a live Personal Access Token sitting on disk
  in a readable script, not an env var or a git-ignored secrets file. It
  should be rotated and moved out of the script (e.g. read from an
  environment variable or a local untracked config) before this directory
  is ever pushed anywhere or shared.
- `outside-hours.sh` checks `if [[ -z "$TOKEN" ]]` and prints "ERROR:
  GITLAB_TOKEN nicht gesetzt" if empty, but `TOKEN` is hardcoded on the line
  right above it — this check can never actually trigger, and the error
  message refers to an env var (`GITLAB_TOKEN`) that the script never reads.
  It looks like a leftover from an earlier version that did read the token
  from the environment.
- `outside-hours.sh`'s final "Commits außerhalb: $outside_commits" count is
  always `0`. The counting loop (`| jq ... | while read -r commit; do
  ((outside_commits++)); done`) runs in a subshell because it's on the
  right side of a pipe, so the increments never survive back into the
  parent shell — only the per-commit lines printed *inside* the loop are
  reliable, the final tally is not.
- `hours-getter.sh` only reads the first 200 issues and the first 100 notes
  per issue (no pagination beyond that) — on a project with more issues or
  very chatty issues, results would be incomplete.
- Both scripts target one fixed project (ID `74327754`) and, in
  `outside-hours.sh`, one fixed day/time window (Wednesday 14:10–16:50 UTC)
  — neither is generalized or parameterized.
