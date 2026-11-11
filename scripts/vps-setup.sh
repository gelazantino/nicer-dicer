#!/usr/bin/env bash
# One-shot VPS setup + start for Nicer Dicer match/auth server.
# Usage (from repo root on the VPS):
#   bash scripts/vps-setup.sh
# Optional:
#   BRANCH=main bash scripts/vps-setup.sh          # git pull this branch first
#   CORS_ORIGINS=https://nicer-dicer.vercel.app bash scripts/vps-setup.sh
#   SKIP_PULL=1 bash scripts/vps-setup.sh         # don't git pull
#   SKIP_CADDY=1 bash scripts/vps-setup.sh        # don't print/write Caddy hints

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="${APP_NAME:-nicer-dicer}"
BRANCH="${BRANCH:-}"
SKIP_PULL="${SKIP_PULL:-0}"
SKIP_CADDY="${SKIP_CADDY:-0}"
DOMAIN="${DOMAIN:-dice.lockersmoker.com}"
PORT="${PORT:-8787}"
CORS_ORIGINS="${CORS_ORIGINS:-https://nicer-dicer.vercel.app}"
ENV_FILE="$ROOT/.env.server"
DATA_DIR="$ROOT/data"
SQLITE_PATH="${SQLITE_PATH:-$DATA_DIR/nicer-dicer.sqlite}"

echo "==> Nicer Dicer VPS setup"
echo "    root: $ROOT"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: '$1' is required but not installed." >&2
    exit 1
  fi
}

need_cmd node
need_cmd npm

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  echo "ERROR: Node.js 22+ required (found $(node -v)). node:sqlite needs it." >&2
  exit 1
fi
echo "    node: $(node -v)"

if [[ "$SKIP_PULL" != "1" ]] && [[ -d .git ]]; then
  need_cmd git
  echo "==> Updating git"
  git fetch --all --prune
  if [[ -n "$BRANCH" ]]; then
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
  else
    git pull --ff-only || true
  fi
  echo "    HEAD: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
fi

echo "==> npm install"
npm install

mkdir -p "$DATA_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> Creating $ENV_FILE"
  JWT_SECRET="$(node -p "require('crypto').randomBytes(48).toString('hex')")"
  cat >"$ENV_FILE" <<EOF
PORT=$PORT
JWT_SECRET=$JWT_SECRET
SQLITE_PATH=$SQLITE_PATH
CORS_ORIGINS=$CORS_ORIGINS
ROOM_EMPTY_GRACE_MS=90000
INVITE_TTL_MS=1800000
EOF
  chmod 600 "$ENV_FILE"
  echo "    wrote new JWT_SECRET (kept only in .env.server)"
else
  echo "==> Using existing $ENV_FILE"
  # Ensure critical keys exist
  if ! grep -q '^JWT_SECRET=' "$ENV_FILE"; then
    JWT_SECRET="$(node -p "require('crypto').randomBytes(48).toString('hex')")"
    echo "JWT_SECRET=$JWT_SECRET" >>"$ENV_FILE"
    echo "    appended JWT_SECRET"
  fi
  if ! grep -q '^SQLITE_PATH=' "$ENV_FILE"; then
    echo "SQLITE_PATH=$SQLITE_PATH" >>"$ENV_FILE"
  fi
  if ! grep -q '^CORS_ORIGINS=' "$ENV_FILE"; then
    echo "CORS_ORIGINS=$CORS_ORIGINS" >>"$ENV_FILE"
  fi
  if ! grep -q '^PORT=' "$ENV_FILE"; then
    echo "PORT=$PORT" >>"$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE" || true
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing pm2 globally"
  npm install -g pm2
fi

echo "==> Starting/restarting pm2 app '$APP_NAME'"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save
echo "    tip: run 'pm2 startup' once so it survives reboot"

sleep 1
HEALTH_URL="http://127.0.0.1:${PORT}/health"
echo "==> Health check $HEALTH_URL"
if command -v curl >/dev/null 2>&1; then
  if curl -fsS "$HEALTH_URL"; then
    echo
    echo "    OK"
  else
    echo
    echo "WARNING: health check failed — run: pm2 logs $APP_NAME" >&2
  fi
else
  echo "    (curl not installed; skip)"
fi

if [[ "$SKIP_CADDY" != "1" ]]; then
  CADDY_SNIPPET="$ROOT/deploy/Caddyfile.snippet"
  mkdir -p "$ROOT/deploy"
  cat >"$CADDY_SNIPPET" <<EOF
# Point DNS A record for $DOMAIN at this VPS, then merge into /etc/caddy/Caddyfile:
$DOMAIN {
	reverse_proxy 127.0.0.1:$PORT
}
EOF
  echo "==> Caddy"
  if command -v caddy >/dev/null 2>&1; then
    if [[ -f /etc/caddy/Caddyfile ]] && grep -q "$DOMAIN" /etc/caddy/Caddyfile 2>/dev/null; then
      echo "    $DOMAIN already mentioned in /etc/caddy/Caddyfile"
      echo "    reload if you changed it: sudo systemctl reload caddy"
    else
      echo "    snippet written to $CADDY_SNIPPET"
      echo "    add it to /etc/caddy/Caddyfile then: sudo systemctl reload caddy"
    fi
  else
    echo "    Caddy not found; ensure TLS proxy for $DOMAIN → 127.0.0.1:$PORT"
    echo "    snippet: $CADDY_SNIPPET"
  fi
fi

echo
echo "==> Done"
echo "    Local API:  http://127.0.0.1:$PORT/health"
echo "    Public API: https://$DOMAIN/health  (after Caddy/DNS)"
echo "    Public WS:  wss://$DOMAIN"
echo
echo "    Vercel env (then Redeploy):"
echo "      VITE_WS_URL=wss://$DOMAIN"
echo "      VITE_API_URL=https://$DOMAIN"
echo
echo "    Useful: pm2 status | pm2 logs $APP_NAME | pm2 restart $APP_NAME"
