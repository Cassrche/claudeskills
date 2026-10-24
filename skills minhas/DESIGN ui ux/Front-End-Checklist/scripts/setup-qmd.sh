#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EMBED=false

if [[ "${1:-}" == "--embed" ]]; then
  EMBED=true
fi

ensure_collection() {
  local name="$1"
  local path="$2"
  local mask="$3"

  if qmd collection show "$name" >/dev/null 2>&1; then
    echo "QMD collection '$name' already exists"
    return
  fi

  qmd collection add "$path" --name "$name" --mask "$mask"
}

ensure_collection "rules" "$ROOT_DIR/packages/content/rules" "**/*.mdx"
ensure_collection "checklists" "$ROOT_DIR/packages/content/checklists" "**/*.mdx"

qmd update

if [[ "$EMBED" == "true" ]]; then
  qmd embed
else
  qmd status
  echo ""
  echo "Run './scripts/setup-qmd.sh --embed' to generate embeddings."
fi
