<div align="center">

# dev-utilities

Three small tools from my own workflow: a GitLab issue importer, a GitLab time-tracking reporter and a Python virtualenv cleaner.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Bash](https://img.shields.io/badge/Bash-4EAA25?logo=gnubash&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)

</div>

Each folder is independent and has its own README with setup and caveats. There is no shared code between them.

## The tools

| Tool | What it does | Stack |
|---|---|---|
| [`gitlab-issue-importer/`](gitlab-issue-importer) | Turns a Markdown issue template into a form and creates the issue in GitLab through the REST API, or downloads the filled-in Markdown. Can also prefill the form from existing open issues. Runs entirely in the browser; the access token lives in memory only. | React 19, Vite 7, Tailwind |
| [`gitlab-hours-tracker/`](gitlab-hours-tracker) | `hours-getter.sh` sums the `/spend` time-tracking notes per user across a project. `outside-hours.sh` lists commits made outside a fixed weekly time window. | Bash, curl, jq, GNU parallel |
| [`python-env-cleaner/`](python-env-cleaner) | Finds leftover `venv`, `.venv`, virtualenvwrapper and conda environments under your home directory and deletes them one prompt at a time. | Bash |

## Getting started

```bash
git clone https://github.com/Wolfi-OwO/dev-utilities.git
cd dev-utilities

# issue importer: open http://localhost:5173
cd gitlab-issue-importer && npm install && npm run dev

# hours tracker: set GITLAB_TOKEN (api scope) and edit PROJECT_ID at the top of the script
cd gitlab-hours-tracker && GITLAB_TOKEN=... ./hours-getter.sh

# env cleaner: interactive, asks before every deletion
cd python-env-cleaner && ./cleanup_py_envs.sh
```

`python-env-cleaner` runs `rm -rf` after you answer `y`. Read the prompt before you do.

## License

MIT, see [LICENSE](LICENSE).
