#!/bin/sh
set -eu

RUNTIME_FILE="${CINEMA_PUBLIC_BASE_URL_FILE:-/runtime/cinema_public_base_url.txt}"
TMP_FILE="${RUNTIME_FILE}.tmp"
mkdir -p "$(dirname "$RUNTIME_FILE")"

echo "Starting ephemeral cloudflared tunnel for cinema gateway..."

cloudflared tunnel --no-autoupdate --url http://web-gateway:8080 2>&1 | while IFS= read -r line; do
  echo "$line"
  url="$(echo "$line" | grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' | head -n1 || true)"
  if [ -n "$url" ]; then
    printf '%s\n' "$url" > "$TMP_FILE"
    mv "$TMP_FILE" "$RUNTIME_FILE"
    echo "Updated runtime cinema URL: $url"
  fi
done
