# DriverLogs

Mobile-first vehicle expense tracking and ownership analytics MVP.

## Structure

- `frontend/` - Next.js, TypeScript, Tailwind CSS, Framer Motion, Recharts, lucide icons
- `backend/` - Go REST API scaffold with clean internal package boundaries
- `docker-compose.yml` - local Postgres and Redis services

## Development Rules

- Keep files small and focused. Route files should orchestrate, not hold full UI implementations.
- Put reusable UI in `frontend/src/components/`, view screens in `frontend/src/components/views/`, and shared helpers/types in `frontend/src/lib/`.
- Keep theme/navigation/category constants centralized in `frontend/src/lib/theme.ts`.
- All money calculations live in the backend: totals, exchange equivalents, category totals, vehicle comparisons, report totals, and cost-per-kilometer.
- Expense currency conversion is stamped when the expense is created using the official National Bank of Moldova exchange-rate feed. Historical expenses keep their stored EUR/USD amounts and rate metadata.
- The frontend formats and presents backend values only.
- The app starts empty. Do not add demo vehicles or seeded expenses.
- Reports are in-app summaries only. No file exports.
- Authentication uses a backend-generated numeric login ID. JWTs last 31 days and refresh on authenticated activity. The login ID remains valid after token expiry, so users can sign in again with the same ID.
- Each user can own up to 4 vehicles, enforced by the backend.
- User settings are stored backend-side. Default base currency and country are user-owned settings and new expenses use the saved base currency when stamping conversions.

## Run Everything

```bash
./start.sh
```

This starts Postgres and Redis with Docker Compose, runs the Go backend through Air live reload, and starts the Next.js frontend.
Press `Ctrl+C` to stop the frontend, backend, Postgres, and Redis. Database containers and volumes are preserved by default.
Normal code changes and restarts do not drop the database. The backend uses Postgres for users, settings, vehicles, and expenses. If Postgres cannot be reached, the API fails fast instead of using temporary in-memory data.

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:18080`
- Postgres: `localhost:55432`
- Redis: `localhost:56379`

Local environment values live in `.env`, which is git ignored.

Useful `.env` keys:

- `BACKEND_PORT=18080`
- `FRONTEND_PORT=3000`
- `POSTGRES_HOST_PORT=55432`
- `REDIS_HOST_PORT=56379`
- `JWT_SECRET=change-this-local-driverlogs-secret-before-sharing`
- `RESET_DB_ON_START=false`
- `CLEAN_DOCKER_VOLUMES_ON_EXIT=false`

`start.sh` derives `DATABASE_URL` and `NEXT_PUBLIC_API_URL` from those values so the ports and credentials stay defined in one place. It only removes database volumes when `CLEAN_DOCKER_VOLUMES_ON_EXIT=true` or `RESET_DB_ON_START=true`.

If Postgres credentials drift because an old local volume exists, set `RESET_DB_ON_START=true` once, run `./start.sh`, then set it back to `false`.

Do not use `docker compose down --volumes` for normal development. That deletes the stored app database.

## Run Database Only

```bash
docker compose up -d postgres redis
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## PWA

DriverLogs ships with a lightweight PWA setup: `manifest.ts`, reusable generated icons from `public/logo.svg`, iOS web app metadata, and a conservative production-only service worker in `public/sw.js`. The service worker caches only same-origin shell/static assets and does not cache backend API writes.

## Run Backend

```bash
cd backend
air
```

Install Air manually if you are not using `./start.sh`:

```bash
go install github.com/air-verse/air@latest
```

The backend listens on `:18080` by default. Set `PORT` or `BACKEND_PORT` to override it. The default database URL is:

```text
postgres://driverlogs:driverlogs@localhost:55432/driverlogs?sslmode=disable
```

## API Routes

- `GET /healthz`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/session`
- `GET /user/settings`
- `PUT /user/settings`
- `GET /vehicle-options/makes`
- `GET /vehicle-options/models?make=Toyota`
- `GET /vehicle-options/vin/1HGCM82633A004352`
- `GET /fuel-prices?country=MD&fuel_type=Petrol`
- `GET /fuel-prices?country=RO&fuel_type=Diesel&region=IASI`
- `GET /vehicles`
- `POST /vehicles`
- `GET /vehicles/{id}`
- `DELETE /vehicles/{id}`
- `GET /expenses`
- `POST /expenses`
- `GET /expenses?vehicle_id=bmw`
- `GET /timeline?vehicle_id=bmw`
- `GET /analytics?vehicle_id=bmw`
- `GET /reports?vehicle_id=bmw&type=monthly`

Vehicle make/model autocomplete and VIN decode are proxied through the backend from the official NHTSA vPIC API. Keep external vehicle data access behind the backend so the UI stays presentation-only and the source can be cached or replaced later. VIN decode can fill make, model, year, engine summary, fuel type, plant country, body class, and manufacturer, but the user must confirm the values before saving.

Fuel price suggestions are also proxied through the backend. Romania uses the free public PretCarburant.ro API for station-level prices. Moldova uses Autotraveler's Moldova national-currency trend table for national reference prices. Do not add providers that require API keys or commercial access unless explicitly requested.

Expense exchange conversion uses the National Bank of Moldova XML endpoint:

```text
https://bnm.md/en/official_exchange_rates?date=01.06.2026&get_xml=1
```
