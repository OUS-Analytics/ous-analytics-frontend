# OUS Analytics Frontend

Next.js frontend for the OUS Analytics dashboard.

## Quickstart

Prerequisites:
- Node.js `20.9.0` (matches CI)
- npm
- Backend running locally (see `../ous-analytics-backend/docs/local_development.md`)

From `ous-analytics-frontend/`:

```bash
cd app
if [ ! -f .env.local ]; then cp .env.local.example .env.local; fi
npm ci
cd ..
npm run dev
```

Open `http://localhost:3000`.

## Docker

The full-stack Compose entrypoint lives in `../ous-analytics-backend/docker-compose.yml`.

From `ous-analytics-backend/`:

```bash
docker compose up --build
```

Detached mode:

```bash
docker compose up -d
```

Stop and remove containers/network:

```bash
docker compose down
```

Follow logs:

```bash
docker compose logs -f
```

Expected URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

Frontend-only image build (optional):

```bash
docker build -t ous-frontend .
docker run --rm -p 3000:3000 --env-file .env ous-frontend
```

## Required Environment

Frontend runtime requires:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Set it in `app/.env.local`.

Optional build-time configuration:

```bash
NEXT_PUBLIC_SNAPSHOT_COVERAGE_RANGE_DAYS=14
```

- Default: `14`
- Allowed range: `1` to `366`
- Applied at build/startup from `NEXT_PUBLIC_*` environment configuration

If this variable is missing, API requests fail with:
- `MISSING_API_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL is required (example: http://localhost:8000)`

## Scripts

Run from `frontend/` unless noted.

| Purpose | Command | Notes |
| --- | --- | --- |
| Start dev server | `npm run dev` | Wrapper around `./runFrontend.sh` |
| Build | `npm run build` | Runs `app` build |
| Start production build | `npm run start` | Requires successful build first |
| Lint | `npm run lint` | ESLint on `app/src/**/*.{ts,tsx,js,jsx}` |
| Tests | `npm run test` | Jest |
| Typecheck | `npm run typecheck` | `tsc --noEmit` |
| Full precommit gates | `npm run precommit` | Format check, lint, coverage gate, typecheck, build |

Equivalent app-local commands (from `frontend/app`) are also available, including `npm run format:check`, `npm run test:ci`, and `npm run test:coverage`.

## Dashboard + API Docs

- Dashboard state machine: `app/docs/dashboard_state_machine.md`
- API client behavior: `app/docs/api_client.md`
- Frontend contribution guide: `app/docs/contributing_frontend.md`
- Documentation campaign report: `app/docs/documentation_campaign_report.md`

## Troubleshooting

### Backend down or unreachable

Symptoms:
- UI shows request failures like `NETWORK_ERROR`
- Dashboard fails to load

Checks:

```bash
curl -i http://localhost:8000/api/v1/health
```

If this fails, start/fix backend first (see `../ous-analytics-backend/docs/local_development.md`).

### CORS errors in browser

When frontend and backend origins differ, browser-blocked responses are surfaced with CORS guidance (mentions `Access-Control-Allow-Origin`).

Fixes:
- Ensure backend allows frontend origin (for local dev, usually `http://localhost:3000`)
- Ensure `NEXT_PUBLIC_API_BASE_URL` points to the intended backend

### Missing or wrong API base URL

Symptoms:
- Immediate errors before data loads
- `MISSING_API_BASE_URL`

Fixes:
1. Set `NEXT_PUBLIC_API_BASE_URL` in `app/.env.local`
2. Restart dev server after env changes

### Dataset still processing

If tabs show processing state for a long time, use panel `Refresh status`. Automatic read-model polling pauses after timeout and sets `readModelPollingTimedOut` until manually refreshed.

## Backend References

To avoid duplicating backend docs:
- Backend overview: `../ous-analytics-backend/README.md`
- API surface and contracts: `../ous-analytics-backend/docs/api_reference.md`
- Backend environment/config: `../ous-analytics-backend/docs/configuration_and_env.md`
