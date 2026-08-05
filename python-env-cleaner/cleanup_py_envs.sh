
#!/usr/bin/env bash

set -e

echo "Scanning for Python virtual environments..."

# 1 — Remove local venv/.venv folders
find ~ -type d -name "venv" -o -name ".venv" | while read -r env; do
    echo "Found local venv: $env"
    read -p "Delete this environment? [y/N]: " answer
    if [[ "$answer" == "y" ]]; then
        rm -rf "$env"
        echo "Deleted: $env"
    else
        echo "Skipped."
    fi
done

# 2 — Remove virtualenvwrapper envs
if [[ -d "$HOME/.virtualenvs" ]]; then
    echo "Found virtualenvwrapper environments:"
    ls "$HOME/.virtualenvs"
    read -p "Delete ALL virtualenvwrapper envs? [y/N]: " answer2
    if [[ "$answer2" == "y" ]]; then
        rm -rf "$HOME/.virtualenvs"
        echo "Deleted ~/.virtualenvs"
    else
        echo "Skipped."
    fi
fi

# 3 — Remove conda environments (but keep conda installed)
if command -v conda >/dev/null 2>&1; then
    echo "Conda detected. Listing environments:"
    conda env list

    read -p "Delete ALL conda environments except 'base'? [y/N]: " answer3
    if [[ "$answer3" == "y" ]]; then
        for env in $(conda env list | awk '{print $1}' | tail -n +3 | grep -v "^base$"); do
            echo "Removing conda env: $env"
            conda env remove -n "$env" || true
        done
        echo "Conda envs cleaned."
    else
        echo "Skipped conda env removal."
    fi
fi

echo "Cleanup finished."
