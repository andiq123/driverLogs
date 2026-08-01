#!/usr/bin/env bash
# Start the DriverLogs development stack with Docker, Go, and Next.js.
# Docker stays open; Ctrl-C stops the app processes and Postgres container.
# Compatible with the Bash 3.2 bundled with macOS.
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -n "${NVM_BIN:-}" ] && export PATH="$NVM_BIN:$PATH"
export PATH="${HOME}/go/bin:/opt/homebrew/bin:${PATH}"

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
COMPOSE_FILE="$ROOT/docker-compose.yml"

# Values already exported by the shell take precedence over project .env files.
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

BOLD='\033[1m'
RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'

PIDS=""
AIR_CMD=""
CLEANED=0
POSTGRES_STARTED=0

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

docker_ready() {
  docker info >/dev/null 2>&1
}

ensure_docker() {
  require_cmd docker "install Docker Desktop from https://www.docker.com/products/docker-desktop/"
  docker compose version >/dev/null 2>&1 || die "Docker Compose is unavailable — update Docker Desktop"

  if docker_ready; then
    ok "Docker ready"
    return
  fi

  if [ "$(uname -s)" = "Darwin" ] && [ -d "/Applications/Docker.app" ]; then
    log "docker" "starting Docker Desktop…"
    open -ga Docker
  else
    die "Docker is installed but the engine is not running"
  fi

  local attempts=0
  while ! docker_ready; do
    attempts=$((attempts + 1))
    [ "$attempts" -le 60 ] || die "Docker did not become ready within 60 seconds"
    sleep 1
  done
  ok "Docker ready"
}

start_postgres() {
  log "docker" "starting PostgreSQL"
  POSTGRES_STARTED=1
  compose up -d --wait --wait-timeout 60 postgres 2>&1 | prefix "docker" "$CYAN"
  ok "PostgreSQL ready on :$POSTGRES_HOST_PORT"
}

stop_postgres() {
  [ "$POSTGRES_STARTED" -eq 1 ] || return 0
  docker_ready || return 0
  log "docker" "stopping PostgreSQL"
  compose stop postgres 2>&1 | prefix "docker" "$CYAN" || true
}

process_command() {
  ps -p "$1" -o command= 2>/dev/null || true
}

release_project_port() {
  local port="$1" label="$2" pids pid command parent parent_command target
  command -v lsof >/dev/null 2>&1 || return 0
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  [ -z "$pids" ] && return

  for pid in $pids; do
    command="$(process_command "$pid")"
    if [[ "$command" == *"$ROOT"* ]] \
      || [[ "$command" == *"driverlogs-api"* ]] \
      || [[ "$command" == *"next dev"* ]]; then
      log "port" "stopping stale $label process on :$port"
      target="$pid"
      parent="$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ' || true)"
      parent_command="$(process_command "$parent")"
      if [[ "$parent_command" == *"/air"* ]] || [[ "$parent_command" == "air "* ]]; then
        target="$parent"
      fi
      kill_tree "$target" TERM
    else
      die "$label port $port is already used by: $command"
    fi
  done

  sleep 0.3
  lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 \
    && die "$label port $port is still in use"
}

clear_stale_next_lock() {
  local lock_file="$FRONTEND_DIR/.next/dev/lock" pid
  [ -f "$lock_file" ] || return 0
  pid="$(sed -n 's/.*"pid":\([0-9][0-9]*\).*/\1/p' "$lock_file" 2>/dev/null || true)"

  if [ -z "$pid" ] || ! ps -p "$pid" >/dev/null 2>&1; then
    rm -f "$lock_file"
    return
  fi

  log "front" "stopping stale Next.js process"
  kill_tree "$pid" TERM
  sleep 0.3
  ps -p "$pid" >/dev/null 2>&1 && die "the previous Next.js process is still running"
}

ensure_frontend_dependencies() {
  [ -d "$FRONTEND_DIR/node_modules" ] && return
  log "npm" "installing frontend dependencies"
  (cd "$FRONTEND_DIR" && npm ci --prefer-offline --no-audit --no-fund) \
    2>&1 | prefix "npm" "$CYAN"
}

resolve_air() {
  if command -v air >/dev/null 2>&1; then
    AIR_CMD="$(command -v air)"
    return
  fi

  log "air" "installing the Go live-reload tool"
  go install github.com/air-verse/air@latest
  if [ -n "$(go env GOBIN)" ]; then
    AIR_CMD="$(go env GOBIN)/air"
  else
    AIR_CMD="$(go env GOPATH)/bin/air"
  fi
  [ -x "$AIR_CMD" ] || die "Air was installed but could not be found"
}

track_pid() {
  PIDS="$PIDS $1"
}

# macOS lacks setsid, so terminate each child tree explicitly.
kill_tree() {
  local pid="$1" signal="${2:-TERM}" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child" "$signal"
  done
  kill "-$signal" "$pid" 2>/dev/null || true
}

start_backend() {
  log "api" "starting on :$BACKEND_PORT"
  (
    cd "$BACKEND_DIR"
    PORT="$BACKEND_PORT" \
      DATABASE_URL="$DATABASE_URL" \
      JWT_SECRET="$JWT_SECRET" \
      CORS_ALLOWED_ORIGINS="$CORS_ALLOWED_ORIGINS" \
      "$AIR_CMD" 2>&1 | prefix "api" "$GREEN"
  ) &
  track_pid $!
}

start_frontend() {
  log "web" "starting on :$FRONTEND_PORT"
  (
    cd "$FRONTEND_DIR"
    NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
      npm run dev -- --port "$FRONTEND_PORT" 2>&1 | prefix "web" "$CYAN"
  ) &
  track_pid $!
}

stop_apps() {
  local pid
  for pid in $PIDS; do
    kill_tree "$pid" TERM
  done
  sleep 0.5
  for pid in $PIDS; do
    kill -0 "$pid" >/dev/null 2>&1 && kill_tree "$pid" KILL
  done
  wait 2>/dev/null || true
  PIDS=""
}

wait_for_apps() {
  local pid
  while :; do
    for pid in $PIDS; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        wait "$pid" 2>/dev/null || true
        warn "an app process stopped; shutting down the stack"
        return 1
      fi
    done
    sleep 1
  done
}

cleanup() {
  local status=$?
  [ "$CLEANED" -eq 1 ] && return 0
  CLEANED=1
  trap - INT TERM EXIT

  printf "\n${YELLOW}${BOLD}Stopping DriverLogs…${RESET}\n"
  stop_apps
  stop_postgres
  printf "${GREEN}${BOLD}Stopped.${RESET}\n"
  exit "$status"
}

main() {
  trap 'exit 130' INT TERM
  trap cleanup EXIT

  log "check" "checking development tools"
  require_cmd go "install Go from https://go.dev/dl/"
  require_cmd node "install Node.js"
  require_cmd npm "install npm"
  load_env
  ensure_docker
  ok "$(go version | awk '{print $3}') · Node $(node -v)"

  clear_stale_next_lock
  release_project_port "$BACKEND_PORT" "API"
  release_project_port "$FRONTEND_PORT" "frontend"
  ensure_frontend_dependencies
  resolve_air
  start_postgres
  start_backend
  start_frontend

  printf "\n${BOLD}DriverLogs is ready${RESET}\n"
  printf "  Frontend  http://localhost:%s\n" "$FRONTEND_PORT"
  printf "  API       http://localhost:%s\n" "$BACKEND_PORT"
  printf "  Database  localhost:%s\n" "$POSTGRES_HOST_PORT"
  printf "\n${YELLOW}Press Ctrl-C to stop.${RESET}\n\n"

  wait_for_apps
}

main "$@"
