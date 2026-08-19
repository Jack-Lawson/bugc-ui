#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."

if [ ! -f "package.json" ]; then
  echo "skip frontend: package.json not found"
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "skip frontend: npm not found"
  exit 0
fi

out_dir="${TMPDIR:-/tmp}/$(basename "$PWD")-build"
npm run build -- --outDir "$out_dir" --emptyOutDir