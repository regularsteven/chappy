#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-}"
DMG_PATH="${2:-}"

if [[ -z "${APP_PATH}" || -z "${DMG_PATH}" ]]; then
  echo "Usage: $0 <app-path> <dmg-path>"
  exit 1
fi

if [[ ! -d "${APP_PATH}" ]]; then
  echo "App path does not exist: ${APP_PATH}"
  exit 1
fi

if [[ ! -f "${DMG_PATH}" ]]; then
  echo "DMG path does not exist: ${DMG_PATH}"
  exit 1
fi

echo "Verifying signature: ${APP_PATH}"
codesign --verify --deep --strict --verbose=2 "${APP_PATH}"

echo "Checking signing authority"
if ! codesign --display --verbose=4 "${APP_PATH}" 2>&1 | grep -q "Authority=Developer ID Application"; then
  echo "Expected Developer ID Application authority was not found."
  exit 1
fi

echo "Assessing with Gatekeeper"
spctl --assess --type execute --verbose=4 "${APP_PATH}"

echo "Validating stapled ticket on app"
xcrun stapler validate "${APP_PATH}"

echo "Validating stapled ticket on dmg"
xcrun stapler validate "${DMG_PATH}"

echo "macOS release verification passed."
