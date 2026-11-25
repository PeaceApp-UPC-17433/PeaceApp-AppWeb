#!/bin/sh
set -e

escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > /tmp/runtime-config.js <<JS
window.__PEACEAPP_CONFIG__ = {
  "API_URL": "$(escape "${API_URL:-/api/v1}")",
  "MAPBOX_ACCESS_TOKEN": "$(escape "${MAPBOX_ACCESS_TOKEN:-}")",
  "CLOUDINARY_CLOUD": "$(escape "${CLOUDINARY_CLOUD:-}")",
  "CLOUDINARY_PRESET": "$(escape "${CLOUDINARY_PRESET:-}")",
  "LANDING_URL": "$(escape "${LANDING_URL:-}")"
}
JS
