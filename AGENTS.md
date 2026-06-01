<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DriverLogs Project Rules

## Structure

- Keep `frontend/` and `backend/` in one root repository.
- Do not create large route or component files. Split pages into small views, forms, shared UI, API clients, formatters, and typed helpers.
- Prefer reusable components in `frontend/src/components/` and reusable helpers in `frontend/src/lib/`.
- Keep theme constants, navigation definitions, palettes, categories, and empty view models centralized in `frontend/src/lib/theme.ts`.
- Keep shared frontend types in `frontend/src/lib/types.ts`.

## Data Ownership

- The frontend presents data and sends user input only.
- Hard money calculations must be done in the backend. This includes totals, currency equivalents, category totals, vehicle comparisons, and report totals.
- Currency equivalents must be stamped on expense creation from the official National Bank of Moldova exchange-rate feed. Analytics must sum stored stamped values, not recalculate old expense conversions with current rates.
- User default base currency and country are backend settings. New expenses should use the saved base currency, then store both the entered base amount/currency and stamped MDL/EUR/USD values.
- Persist users, settings, vehicles, and expenses in Postgres. Do not add in-memory store fallbacks for app data; startup should fail if the database is unavailable.
- Frontend code may format numeric values returned by the backend, but must not calculate ownership totals, exchange conversions, report totals, or cost-per-kilometer.
- Do not add demo or seeded vehicle/expense data. Empty app state must be real and user-created data must come through API calls.
- Vehicle make/model autocomplete and VIN decode should be served through backend endpoints. Do not bind frontend forms directly to third-party vehicle APIs. VIN decode is assistive only: it can prefill fields, but users must confirm before saving.
- Fuel price suggestions must be served through backend endpoints. Use free sources only by default: PretCarburant.ro for Romania station-level prices and Autotraveler for Moldova national reference prices. Do not add API-key or commercial fuel-price providers unless explicitly requested.
- Do not add file exports unless explicitly requested again. Reports are clean in-app summaries.

## Authentication

- Login is based on a backend-generated random numeric login ID.
- Login IDs must be generated with cryptographic randomness and stored hashed server-side.
- JWTs are valid for 31 days and must be refreshed on authenticated activity.
- Token expiry must not invalidate the login ID. Users should be able to sign in again with the same login ID after 31 days.
- Frontend stores and sends tokens, but authentication decisions and token refreshes belong to the backend.
- Each user can own at most 4 vehicles. Enforce this in the backend.

## Environment

- Create `.env` directly for local values. Do not create `.env.example`.
- `.env` stays git ignored.
