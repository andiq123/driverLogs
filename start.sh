#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
OVERRIDE_BACKEND_PORT="${BACKEND_PORT:-}"
OVERRIDE_FRONTEND_PORT="${FRONTEND_PORT:-}"
OVERRIDE_POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-}"
OVERRIDE_POSTGRES_DB="${POSTGRES_DB:-}"
OVERRIDE_POSTGRES_USER="${POSTGRES_USER:-}"
OVERRIDE_POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
OVERRIDE_REDIS_HOST_PORT="${REDIS_HOST_PORT:-}"
OVERRIDE_DATABASE_URL="${DATABASE_URL:-}"
OVERRIDE_NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"
OVERRIDE_RESET_DB_ON_START="${RESET_DB_ON_START:-}"
OVERRIDE_CLEAN_DOCKER_VOLUMES_ON_EXIT="${CLEAN_DOCKER_VOLUMES_ON_EXIT:-}"
OVERRIDE_JWT_SECRET="${JWT_SECRET:-}"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

BACKEND_PORT="${OVERRIDE_BACKEND_PORT:-${BACKEND_PORT:-}}"
FRONTEND_PORT="${OVERRIDE_FRONTEND_PORT:-${FRONTEND_PORT:-}}"
POSTGRES_HOST_PORT="${OVERRIDE_POSTGRES_HOST_PORT:-${POSTGRES_HOST_PORT:-}}"
POSTGRES_DB="${OVERRIDE_POSTGRES_DB:-${POSTGRES_DB:-}}"
POSTGRES_USER="${OVERRIDE_POSTGRES_USER:-${POSTGRES_USER:-}}"
POSTGRES_PASSWORD="${OVERRIDE_POSTGRES_PASSWORD:-${POSTGRES_PASSWORD:-}}"
REDIS_HOST_PORT="${OVERRIDE_REDIS_HOST_PORT:-${REDIS_HOST_PORT:-}}"
DATABASE_URL="${OVERRIDE_DATABASE_URL:-${DATABASE_URL:-}}"
NEXT_PUBLIC_API_URL="${OVERRIDE_NEXT_PUBLIC_API_URL:-${NEXT_PUBLIC_API_URL:-}}"
RESET_DB_ON_START="${OVERRIDE_RESET_DB_ON_START:-${RESET_DB_ON_START:-}}"
CLEAN_DOCKER_VOLUMES_ON_EXIT="${OVERRIDE_CLEAN_DOCKER_VOLUMES_ON_EXIT:-${CLEAN_DOCKER_VOLUMES_ON_EXIT:-}}"
JWT_SECRET="${OVERRIDE_JWT_SECRET:-${JWT_SECRET:-}}"

BACKEND_PORT="${BACKEND_PORT:-18080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-55432}"
POSTGRES_DB="${POSTGRES_DB:-driverlogs}"
POSTGRES_USER="${POSTGRES_USER:-driverlogs}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-driverlogs}"
REDIS_HOST_PORT="${REDIS_HOST_PORT:-56379}"
DATABASE_URL="${DATABASE_URL:-postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$POSTGRES_HOST_PORT/$POSTGRES_DB?sslmode=disable}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:$BACKEND_PORT}"
RESET_DB_ON_START="${RESET_DB_ON_START:-false}"
CLEAN_DOCKER_VOLUMES_ON_EXIT="${CLEAN_DOCKER_VOLUMES_ON_EXIT:-false}"
JWT_SECRET="${JWT_SECRET:-local-dev-change-this-secret}"

export BACKEND_PORT FRONTEND_PORT POSTGRES_HOST_PORT POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD REDIS_HOST_PORT DATABASE_URL NEXT_PUBLIC_API_URL JWT_SECRET

PIDS=()
STOPPING=0

cleanup() {
  if [ "$STOPPING" -eq 1 ]; then
    return
  fi
  STOPPING=1

  echo
  echo "Stopping DriverLogs..."

  if [ "${#PIDS[@]}" -gt 0 ]; then
    for pid in "${PIDS[@]}"; do
      kill -- "-$pid" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true
    done
    sleep 0.3
    for pid in "${PIDS[@]}"; do
      kill -9 -- "-$pid" >/dev/null 2>&1 || kill -9 "$pid" >/dev/null 2>&1 || true
    done
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi

  if [ "${COMPOSE_READY:-0}" -eq 1 ]; then
    echo "Stopping database services..."
    if [ "$CLEAN_DOCKER_VOLUMES_ON_EXIT" = "true" ]; then
      "${COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans --volumes
    else
      "${COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" stop postgres redis
    fi
  fi
}
trap cleanup EXIT INT TERM

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

process_command() {
  local pid="$1"
  ps -p "$pid" -o command= 2>/dev/null || true
}

stop_app_port_processes() {
  local port="$1"
  local label="$2"

  if ! command_exists lsof; then
    return
  fi

  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return
  fi

  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    local command
    command="$(process_command "$pid")"
    if [[ "$command" == *"$ROOT_DIR"* ]] || [[ "$command" == *"driverlogs-api"* ]] || [[ "$command" == *"next dev"* ]]; then
      echo "Stopping existing $label process on port $port: $pid"
      kill "$pid" >/dev/null 2>&1 || true
    else
      echo "$label port $port is already used by another process:"
      echo "$command"
      echo "Change the port in .env or stop that process, then run ./start.sh again."
      exit 1
    fi
  done <<< "$pids"

  sleep 0.3
  if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "$label port $port is still in use after stopping app-owned processes."
    exit 1
  fi
}

stop_workspace_processes() {
  if ! command_exists pgrep; then
    return
  fi

  local pids
  pids="$(pgrep -f "$ROOT_DIR" 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return
  fi

  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    [ "$pid" = "$$" ] && continue
    local command
    command="$(process_command "$pid")"
    if [[ "$command" == *"node --experimental-vm-modules"* ]] || [[ "$command" == *"kernel.js"* ]]; then
      continue
    fi
    if [[ "$command" == *"next dev"* ]] || [[ "$command" == *"next-server"* ]] || [[ "$command" == *"driverlogs-api"* ]] || [[ "$command" == *" air"* ]] || [[ "$command" == *"/air"* ]] || [[ "$command" == *"go run ./cmd/api"* ]]; then
      echo "Stopping existing DriverLogs process: $pid"
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done <<< "$pids"
}

stop_frontend_lock_process() {
  local lock_file="$FRONTEND_DIR/.next/dev/lock"
  if [ ! -f "$lock_file" ]; then
    return
  fi

  local pid
  pid="$(sed -n 's/.*"pid":\([0-9][0-9]*\).*/\1/p' "$lock_file" 2>/dev/null || true)"
  if [ -z "$pid" ] || ! ps -p "$pid" >/dev/null 2>&1; then
    rm -f "$lock_file"
    return
  fi

  echo "Stopping existing Frontend dev process for this workspace: $pid"
  kill "$pid" >/dev/null 2>&1 || true
  sleep 0.3
  if ps -p "$pid" >/dev/null 2>&1; then
    echo "Frontend dev process $pid is still running. Stop it, then run ./start.sh again."
    exit 1
  fi
}

if ! command_exists docker; then
  echo "Docker is required to start the database."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command_exists docker-compose; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is required to start the database."
  exit 1
fi
COMPOSE_READY=1

if [ "$RESET_DB_ON_START" = "true" ]; then
  echo "Resetting database volumes..."
  "${COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans --volumes
else
  "${COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans >/dev/null 2>&1 || true
fi

stop_workspace_processes
stop_app_port_processes "$BACKEND_PORT" "Backend"
stop_frontend_lock_process
stop_app_port_processes "$FRONTEND_PORT" "Frontend"
stop_app_port_processes "$POSTGRES_HOST_PORT" "Postgres"
stop_app_port_processes "$REDIS_HOST_PORT" "Redis"

echo "Starting database services..."
"${COMPOSE[@]}" -f "$ROOT_DIR/docker-compose.yml" up -d postgres redis

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

AIR_CMD="air"
if ! command_exists air; then
  echo "Installing Air for backend live reload..."
  go install github.com/air-verse/air@latest
  GOBIN="$(go env GOBIN)"
  if [ -n "$GOBIN" ] && [ -x "$GOBIN/air" ]; then
    AIR_CMD="$GOBIN/air"
  else
    AIR_CMD="$(go env GOPATH)/bin/air"
  fi
fi

echo "Starting backend on http://localhost:$BACKEND_PORT"
(cd "$BACKEND_DIR" && PORT="$BACKEND_PORT" DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" "$AIR_CMD") &
PIDS+=("$!")

echo "Starting frontend on http://localhost:$FRONTEND_PORT"
(cd "$FRONTEND_DIR" && NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" npm run dev -- --port "$FRONTEND_PORT") &
PIDS+=("$!")

wait
