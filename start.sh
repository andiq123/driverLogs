#!/usr/bin/env bash
# DriverLogs local stack — Colima → Postgres → API → frontend.
# Ctrl-C stops apps, compose, then Colima (unless KEEP_COLIMA=1).
#
# Requires Bash. macOS ships Bash 3.2 — keep syntax compatible.
set -euo pipefail

# ── PATH: nvm Node first, then Go tooling / Homebrew ───────────────────────────
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -n "${NVM_BIN:-}" ] && export PATH="$NVM_BIN:$PATH"
export PATH="${HOME}/go/bin:/opt/homebrew/bin:${PATH}"

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
COMPOSE_FILE="$ROOT/docker-compose.yml"

# KEEP_COLIMA=1 leaves Colima running after Ctrl-C.
KEEP_COLIMA="${KEEP_COLIMA:-0}"

# CLI / shell overrides win over values loaded from .env files.
OVERRIDE_BACKEND_PORT="${BACKEND_PORT:-}"
OVERRIDE_FRONTEND_PORT="${FRONTEND_PORT:-}"
OVERRIDE_POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-}"
OVERRIDE_POSTGRES_DB="${POSTGRES_DB:-}"
OVERRIDE_POSTGRES_USER="${POSTGRES_USER:-}"
OVERRIDE_POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
OVERRIDE_DATABASE_URL="${DATABASE_URL:-}"
OVERRIDE_NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"
OVERRIDE_CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-}"
OVERRIDE_JWT_SECRET="${JWT_SECRET:-}"

BOLD='\033[1m'; RESET='\033[0m'
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'

PIDS=""
CLEANED=0
MANAGE_COLIMA=0

log()  { printf "${BOLD}[%s]${RESET} %s\n" "$1" "$2"; }
ok()   { printf "${GREEN}${BOLD}OK${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}${BOLD}!${RESET} %s\n" "$1"; }
die()  { printf "${RED}${BOLD}error:${RESET} %s\n" "$1" >&2; exit 1; }

prefix() {
  local label="$1" color="$2" line
  while IFS= read -r line || [ -n "$line" ]; do
    printf "${color}${BOLD}[%s]${RESET} %s\n" "$label" "$line"
  done
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing $1 — ${2:-install it and retry}"
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

source_env_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  set -a
  # shellcheck disable=SC1090
  . "$file"
  set +a
}

load_env() {
  source_env_file "$BACKEND_DIR/.env"
  source_env_file "$FRONTEND_DIR/.env"

  BACKEND_PORT="${OVERRIDE_BACKEND_PORT:-${BACKEND_PORT:-18080}}"
  FRONTEND_PORT="${OVERRIDE_FRONTEND_PORT:-${FRONTEND_PORT:-3000}}"
  POSTGRES_HOST_PORT="${OVERRIDE_POSTGRES_HOST_PORT:-${POSTGRES_HOST_PORT:-55432}}"
  POSTGRES_DB="${OVERRIDE_POSTGRES_DB:-${POSTGRES_DB:-driverlogs}}"
  POSTGRES_USER="${OVERRIDE_POSTGRES_USER:-${POSTGRES_USER:-driverlogs}}"
  POSTGRES_PASSWORD="${OVERRIDE_POSTGRES_PASSWORD:-${POSTGRES_PASSWORD:-driverlogs}}"
  DATABASE_URL="${OVERRIDE_DATABASE_URL:-${DATABASE_URL:-postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_HOST_PORT/$POSTGRES_DB?sslmode=disable}}"
  NEXT_PUBLIC_API_URL="${OVERRIDE_NEXT_PUBLIC_API_URL:-${NEXT_PUBLIC_API_URL:-http://localhost:$BACKEND_PORT}}"
  CORS_ALLOWED_ORIGINS="${OVERRIDE_CORS_ALLOWED_ORIGINS:-${CORS_ALLOWED_ORIGINS:-http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT}}"
  JWT_SECRET="${OVERRIDE_JWT_SECRET:-${JWT_SECRET:-local-dev-change-this-secret}}"

  export BACKEND_PORT FRONTEND_PORT POSTGRES_HOST_PORT POSTGRES_DB POSTGRES_USER \
    POSTGRES_PASSWORD DATABASE_URL NEXT_PUBLIC_API_URL CORS_ALLOWED_ORIGINS JWT_SECRET
}

# ── Colima ─────────────────────────────────────────────────────────────────────
colima_running() {
  colima status >/dev/null 2>&1
}

docker_ready() {
  docker info >/dev/null 2>&1
}

ensure_colima() {
  require_cmd colima "brew install colima docker"
  require_cmd docker "brew install docker"

  if colima_running && docker_ready; then
    log "colima" "already running"
    MANAGE_COLIMA=1
    return 0
  fi

  log "colima" "starting…"
  colima start --activate 2>&1 | prefix "colima" "$CYAN"
  MANAGE_COLIMA=1

  local i=0
  while ! docker_ready; do
    i=$((i + 1))
    [ "$i" -le 90 ] || die "Docker engine not ready after Colima start"
    sleep 0.5
  done
  ok "Colima + Docker ready"
}

stop_colima() {
  [ "$MANAGE_COLIMA" -eq 1 ] || return 0
  if [ "$KEEP_COLIMA" = "1" ]; then
    warn "KEEP_COLIMA=1 — leaving Colima running"
    return 0
  fi
  if colima_running; then
    log "colima" "stopping…"
    colima stop 2>&1 | prefix "colima" "$CYAN" || true
  fi
}

# ── Docker compose ─────────────────────────────────────────────────────────────
start_infra() {
  log "docker" "PostgreSQL"
  if compose up -d --wait --wait-timeout 60 postgres 2>&1 | prefix "docker" "$CYAN"; then
    ok "Postgres ready"
    return 0
  fi

  warn "compose --wait failed; falling back to health checks"
  compose up -d postgres 2>&1 | prefix "docker" "$CYAN"

  local i=0
  while [ "$i" -lt 60 ]; do
    if compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      ok "Postgres ready"
      return 0
    fi
    i=$((i + 1))
    sleep 0.5
  done
  die "Postgres did not become ready"
}

stop_infra() {
  if docker_ready; then
    log "docker" "compose down"
    compose down --remove-orphans 2>&1 | prefix "docker" "$CYAN" || true
  fi
}

# ── Port / leftover process helpers ────────────────────────────────────────────
process_command() {
  local pid="$1"
  ps -p "$pid" -o command= 2>/dev/null || true
}

stop_app_port_processes() {
  local port="$1"
  local label="$2"
  command -v lsof >/dev/null 2>&1 || return 0

  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  [ -z "$pids" ] && return 0

  local pid command
  for pid in $pids; do
    command="$(process_command "$pid")"
    if [[ "$command" == *"$ROOT"* ]] \
      || [[ "$command" == *"driverlogs-api"* ]] \
      || [[ "$command" == *"next dev"* ]]; then
      log "port" "stopping existing $label on :$port (pid $pid)"
      kill "$pid" >/dev/null 2>&1 || true
    else
      die "$label port $port is used by another process: $command"
    fi
  done

  sleep 0.3
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    die "$label port $port is still in use"
  fi
}

stop_frontend_lock_process() {
  local lock_file="$FRONTEND_DIR/.next/dev/lock"
  [ -f "$lock_file" ] || return 0

  local pid
  pid="$(sed -n 's/.*"pid":\([0-9][0-9]*\).*/\1/p' "$lock_file" 2>/dev/null || true)"
  if [ -z "$pid" ] || ! ps -p "$pid" >/dev/null 2>&1; then
    rm -f "$lock_file"
    return 0
  fi

  log "front" "stopping existing Next lock holder $pid"
  kill "$pid" >/dev/null 2>&1 || true
  sleep 0.3
  if ps -p "$pid" >/dev/null 2>&1; then
    die "Frontend process $pid is still running"
  fi
}

ensure_node_modules() {
  [ -d "$FRONTEND_DIR/node_modules" ] && return 0
  log "npm" "install frontend"
  (cd "$FRONTEND_DIR" && npm ci --prefer-offline --no-audit --no-fund) \
    2>&1 | prefix "npm" "$CYAN"
}

resolve_air() {
  if command -v air >/dev/null 2>&1; then
    command -v air
    return 0
  fi
  log "air" "installing github.com/air-verse/air@latest"
  go install github.com/air-verse/air@latest
  local gobin
  gobin="$(go env GOBIN)"
  if [ -n "$gobin" ] && [ -x "$gobin/air" ]; then
    printf '%s\n' "$gobin/air"
  else
    printf '%s\n' "$(go env GOPATH)/bin/air"
  fi
}

# ── App processes ──────────────────────────────────────────────────────────────
track_pid() {
  PIDS="$PIDS $1"
}

# Kill a pid and its descendants (macOS has no setsid).
kill_tree() {
  local pid="$1" sig="${2:-TERM}" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child" "$sig"
  done
  kill "-$sig" "$pid" 2>/dev/null || true
}

start_backend() {
  local air_cmd
  air_cmd="$(resolve_air)"
  log "backend :$BACKEND_PORT" "air live reload"
  (
    cd "$BACKEND_DIR"
    PORT="$BACKEND_PORT" \
      DATABASE_URL="$DATABASE_URL" \
      JWT_SECRET="$JWT_SECRET" \
      CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS" \
      "$air_cmd" 2>&1 | prefix "backend :$BACKEND_PORT" "$GREEN"
  ) &
  track_pid $!
}

start_frontend() {
  log "front   :$FRONTEND_PORT" "next dev"
  (
    cd "$FRONTEND_DIR"
    NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
      npm run dev -- --port "$FRONTEND_PORT" 2>&1 | prefix "front   :$FRONTEND_PORT" "$CYAN"
  ) &
  track_pid $!
}

stop_apps() {
  local pid
  for pid in $PIDS; do
    kill_tree "$pid" TERM
  done
  sleep 1
  for pid in $PIDS; do
    kill_tree "$pid" KILL
  done
  wait 2>/dev/null || true
  PIDS=""
}

cleanup() {
  [ "$CLEANED" -eq 1 ] && return 0
  CLEANED=1
  trap - INT TERM EXIT

  printf "\n${YELLOW}${BOLD}Stopping stack…${RESET}\n"
  stop_apps
  stop_infra
  stop_colima
  printf "${GREEN}${BOLD}All stopped.${RESET}\n"
  exit 0
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  trap cleanup INT TERM EXIT

  log "check" "toolchain"
  require_cmd go "https://go.dev/dl/"
  require_cmd node "install via nvm"
  require_cmd npm "install via nvm"

  load_env
  ok "go=$(go version | awk '{print $3}') node=$(node -v)"

  ensure_colima

  # Drop any stale compose leftovers from a previous run, then free app ports.
  compose down --remove-orphans >/dev/null 2>&1 || true
  stop_frontend_lock_process
  stop_app_port_processes "$BACKEND_PORT" "Backend"
  stop_app_port_processes "$FRONTEND_PORT" "Frontend"
  stop_app_port_processes "$POSTGRES_HOST_PORT" "Postgres"

  ensure_node_modules
  start_infra
  start_backend
  start_frontend

  printf "\n${BOLD}Stack up — ${RED}Ctrl-C${RESET}${BOLD} stops apps, Docker, and Colima.${RESET}\n"
  [ "$KEEP_COLIMA" = "1" ] && warn "KEEP_COLIMA=1 — Colima will stay up on exit"
  printf "${BOLD}  API       ${RESET} http://localhost:%s\n" "$BACKEND_PORT"
  printf "${BOLD}  Frontend  ${RESET} http://localhost:%s\n\n" "$FRONTEND_PORT"

  wait || true
  cleanup
}

main "$@"
