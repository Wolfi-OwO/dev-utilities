# cleanup-python-envs

A small interactive Bash script that finds and optionally deletes leftover
Python virtual environments under the user's home directory.

## What it does

Running `cleanup_py_envs.sh` walks through three cleanup steps, each gated by
an interactive `y/N` prompt:

1. **Local `venv` / `.venv` folders** — runs `find ~ -type d -name "venv" -o -name ".venv"`
   over the entire home directory and asks, once per match found, whether to
   delete it (`rm -rf`).
2. **virtualenvwrapper environments** — if `~/.virtualenvs` exists, lists its
   contents and asks once whether to delete the *entire* `~/.virtualenvs`
   directory (`rm -rf ~/.virtualenvs`).
3. **Conda environments** — if a `conda` binary is on `PATH`, lists all conda
   environments and asks once whether to remove all of them except `base`
   (via `conda env remove -n <env>` for each). Conda itself is left installed.

Each section is skipped if you answer anything other than `y` (case-sensitive,
must be lowercase `y`).

## Problem it solves

Python virtual environments (`venv`, `.venv`, virtualenvwrapper envs, conda
envs) accumulate across old projects and eat disk space. This script sweeps
the home directory for them and gives a manual, per-item chance to delete
each one instead of having to hunt them down and remove them by hand.

## How to run

```bash
chmod +x cleanup_py_envs.sh   # first time only
./cleanup_py_envs.sh
```

No arguments. It runs interactively — sit through the prompts as it finds
things (the `find` step in particular can take a while on a large home
directory since it searches everything under `~`, not just project folders).

## Requirements

- Bash (`#!/usr/bin/env bash`)
- Standard Unix tools: `find`, `rm`, `read`, `awk`, `grep`
- `conda` is optional — step 3 is skipped entirely if `conda` isn't on `PATH`

## Caveats — this script deletes things

- **It is destructive.** Steps 1 and 2 call `rm -rf` on whatever you confirm;
  there is no trash/undo. If you say `y`, the directory is gone.
- **Step 1 searches your entire home directory**, not just development
  folders. Anything anywhere under `~` named `venv` or `.venv` will be
  offered up for deletion, including inside directories you might not expect
  (backups, downloaded archives, unrelated tooling, etc.).
- **The `find` condition has an operator-precedence quirk.** The command is
  `find ~ -type d -name "venv" -o -name ".venv"`, which `find` parses as
  `\( -type d -name "venv" \) -o \( -name ".venv" \)`. The `-type d` only
  applies to the `venv` branch — a *file* (not a directory) named `.venv`
  would also match and get passed to `rm -rf`. In practice `.venv` is almost
  always a directory, but this is not actually enforced by the script as
  written.
- **Step 2 deletes `~/.virtualenvs` as a whole**, not env-by-env — there is no
  way to keep some virtualenvwrapper envs and remove others through this
  script.
- **`set -e` is active**, so if any command in the script errors unexpectedly
  the whole script aborts (conda env removal failures are explicitly
  tolerated via `|| true`, but nothing else is).
- Always read the prompts carefully before answering `y` — deletions are
  immediate and permanent.
