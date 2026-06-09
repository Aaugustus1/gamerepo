#!/usr/bin/env bash
# ============================================================
# Deploy script for The Game Repository (Contabo Ubuntu 22.04)
# Run from /var/www/gamenull (or wherever you cloned the repo)
# ============================================================
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$APP_DIR/server"

echo "==> Pulling latest code"
git pull origin main

echo "==> Installing server dependencies"
cd "$SERVER_DIR"
npm install --omit=dev

echo "==> Running seed (idempotent: clears + re-inserts)"
node seed.js

echo "==> Restarting PM2 process"
pm2 restart gamenull-api || pm2 start server.js --name gamenull-api
pm2 save

echo "==> Deploy complete: $(date)"
