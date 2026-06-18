# Vendor-neutral deployment

Smriti ships as **7 Docker images** published to **GHCR** by GitHub Actions. Any host that can run containers + inject env vars can run production — Railway, Fly.io, ECS, or a VPS with Docker Compose.

## Pipeline overview

| Trigger | What runs |
|---------|-----------|
| Push to `main` (after CI passes) | Build + push 7 images to GHCR (`:sha` and `:latest`) |
| Manual **Deploy** workflow | Optional migrate → optional Railway redeploy → optional smoke test |

Images are tagged as:

```text
ghcr.io/<owner>/smriti-api:<sha>
ghcr.io/<owner>/smriti-embedding-worker:<sha>
… (5 more workers + scheduler)
```

## GitHub secrets

Configure under **Settings → Secrets and variables → Actions**:

| Secret | Required for | Description |
|--------|--------------|-------------|
| `POSTGRES_URL` | Migrate step | Managed Postgres (pgvector) |
| `RAILWAY_TOKEN` | Railway deploy | [Railway account token](https://railway.com/account/tokens) |
| `RAILWAY_PROJECT_ID` | Railway deploy | Project UUID |
| `RAILWAY_ENVIRONMENT` | Railway deploy | e.g. `production` |
| `API_URL` | Smoke test | Public API base URL |
| `API_KEY` | Smoke test | Must match production `API_KEY` |

Make GHCR packages **public** (or grant pull access) so Railway / VPS can pull images.

## First-time setup

### 1. Managed data

Provision externally (not tied to any app host):

- **Postgres + pgvector** — Neon, Supabase, etc.
- **Redis** — Upstash, etc.
- **Kafka** — Upstash, Redpanda Cloud, Confluent, etc.

Run migrations once:

```bash
POSTGRES_URL='postgres://...' pnpm db:migrate
```

Or use the Deploy workflow with **Run database migrations** enabled.

### 2. Choose a runtime

#### Option A — VPS / any Docker host

```bash
cd infra/deploy
cp env.prod.example .env.prod   # edit with real URLs + API_KEY
export IMAGE_REGISTRY=ghcr.io/<your-github-owner>/smriti
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml up -d
```

Only expose port `3000` (API) to the internet.

#### Option B — Railway (optional)

Create **7 services** using **Docker Image** source (not GitHub build):

| Service | Image |
|---------|-------|
| api | `ghcr.io/<owner>/smriti-api:latest` |
| embedding-worker | `ghcr.io/<owner>/smriti-embedding-worker:latest` |
| … | … |
| scheduler | `ghcr.io/<owner>/smriti-scheduler:latest` |

- Set shared env vars from `env.prod.example` on the Railway project.
- **Generate Domain** on `api` only; scheduler replicas = 1.
- Add GitHub secrets and run **Deploy** workflow with target **railway**.

#### Option C — Fly.io / ECS / Kubernetes

Use the same GHCR images and the same env block from `env.prod.example`. Only the orchestrator manifests differ.

## Release procedure

1. Merge to `main` → CI passes → images publish automatically.
2. Run **Deploy** workflow (Actions → Deploy → Run workflow):
   - **Run database migrations** — yes (before app rollout)
   - **Deploy target** — `railway` or `none` (VPS: pull new tags and `compose up -d`)
   - **Run smoke test** — yes when API is up
3. Verify `GET /health/ready` on the API URL.

## Client authentication

Production requires:

```http
x-api-key: <API_KEY>
x-user-id: <uuid>
```

(on routes that use authenticated principals)
