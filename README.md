# dev-utilities

Small personal scripts and tools I use for my own workflow, consolidated
into one repo instead of scattered as separate untracked directories.
Each subdirectory is independent — there's no shared code between them.

- **`python-env-cleaner/`** — finds and removes stray Python virtualenvs
  (`venv`/`.venv` folders, `virtualenvwrapper` envs, conda envs) across my
  home directory. Destructive (`rm -rf`), prompts before each removal.
- **`gitlab-issue-importer/`** — a React + Vite app for importing GitLab
  issues.
- **`gitlab-hours-tracker/`** — shell scripts that pull time-tracking data
  (`/spend` notes) and off-hours commit activity from a GitLab project via
  its API.

See each subdirectory's own README for details, setup, and caveats.
