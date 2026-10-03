#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
pnpm lint:ui-policy
pnpm typecheck
pnpm build:all
if [ -f playwright.config.ts ] || [ -f playwright.config.mjs ]; then
  pnpm exec playwright test
else
  echo "Playwright configuration is not present; browser verification is required before completion." >&2
  exit 2
fi
