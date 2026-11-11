#!/usr/bin/env bash
set -euo pipefail
cd /root/nicer-dicer

echo "==> git pull main"
git fetch origin
git checkout main
git pull --ff-only origin main
echo "    HEAD=$(git rev-parse --short HEAD)"

echo "==> npm install"
npm install

echo "==> restart pm2"
pm2 delete nicer-dicer >/dev/null 2>&1 || true
# free ports from any orphans
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8787/tcp >/dev/null 2>&1 || true
  fuser -k 78/tcp >/dev/null 2>&1 || true
fi
pkill -f 'tsx/dist/cli.mjs' >/dev/null 2>&1 || true
sleep 1
pm2 start ecosystem.config.cjs
pm2 save
sleep 2

echo "==> verify"
node -e "const c=require('./ecosystem.config.cjs'); console.log('PORT', c.apps[0].env.PORT)"
pm2 env 0 | grep -E '^PORT' || true
ss -lntp | grep -E ':8787|:78 ' || true
curl -sS http://127.0.0.1:8787/health; echo
curl -sS https://dice.lockersmoker.com/health; echo
pm2 status
echo "==> done"
