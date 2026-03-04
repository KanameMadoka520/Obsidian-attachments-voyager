#!/usr/bin/env bash
set -e
test -f scripts/build-all.sh
test -f scripts/build-all.ps1
grep -q "tauri:build" scripts/build-all.sh
grep -q "tauri:build" scripts/build-all.ps1
test -f .github/workflows/release.yml
