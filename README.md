# DriverLogs

DriverLogs is a mobile-first vehicle ownership app for tracking real car costs.

It helps a user keep one focused dashboard per selected car, record fuel and service expenses, track odometer-based maintenance, and review ownership analytics from real app data only.

## Features

- Numeric login with user-specific vehicles and settings
- Up to 4 cars per user
- Vehicle profiles with VIN decode support
- Fuel, service, insurance, tires, parking, upgrades, and other expense tracking
- Start/finish trips with automatic fuel grouping, distance, spend, liters, and cost-per-kilometer summaries
- Backend-stamped currency conversion for historical expense accuracy
- Fuel price references and Moldova/Romania comparison in MDL
- Smart estimates for oil change and service trends based on logged records
- Timeline, analytics, and reports for the selected car
- Mobile-first PWA interface

## Project Structure

- `frontend/` — Next.js app
- `backend/` — Go API
- `docker-compose.yml` — local Postgres
- `start.sh` — local development runner

## Local development

```bash
./start.sh
```

Starts Docker Desktop when needed, then PostgreSQL, the Go API with live reload,
and the Next.js frontend. `Ctrl-C` stops the app processes and PostgreSQL while
leaving Docker Desktop open for faster restarts.
