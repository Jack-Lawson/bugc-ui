#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."

if [ -x "./scripts/check-frontend.sh" ]; then ./scripts/check-frontend.sh; fi
