# DriverLogs

DriverLogs is a mobile-first vehicle ownership app for tracking real car costs.

It helps a user keep one focused dashboard per selected car, record fuel and service expenses, track odometer-based maintenance, and review ownership analytics from real app data only.

## Features

- Numeric login with user-specific vehicles and settings
- Up to 4 cars per user
- Vehicle profiles with VIN decode support
- Fuel, service, insurance, tires, parking, upgrades, and other expense tracking
- Backend-stamped currency conversion for historical expense accuracy
- Fuel price references and Moldova/Romania comparison in MDL
- Smart estimates for oil change and service trends based on logged records
- Timeline, analytics, and reports for the selected car
- Mobile-first PWA interface

## Project Structure

- `frontend/` - Next.js app
- `backend/` - Go API
- `docker-compose.yml` - local database services
- `start.sh` - local development runner
