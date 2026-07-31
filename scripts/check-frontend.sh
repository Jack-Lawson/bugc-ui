#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."

if [ -f "package.json" ]; then
  if command -v npm >/dev/null 2>&1; then
    npm run build --if-present
  else
    echo "skip frontend: npm not found"
  fi
else
  echo "skip frontend: package.json not found"
fi
