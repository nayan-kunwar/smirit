# Deployment Strategy

How to deploy **Smriti** (AI Memory Service) from local Docker Compose through production-grade environments. This document complements the [local development runbook](local-development-runbook.md) and the [system architecture](architecture/ai-memory-service-architecture.md).

## Goals


| Goal                  | Approach                                                             |
| --------------------- | -------------------------------------------------------------------- |
| Reproducible builds   | Multi-stage Dockerfiles + `pnpm install --frozen-lockfile`           |
| Safe releases         | CI gates on `main`; migrate before app rollout                       |
| Observable operations | Prometheus, Grafana, OpenTelemetry wired in infra compose            |
| Independent scaling   | One container per app/worker; shared Kafka/Postgres/Redis            |
| Minimal downtime      | Rolling restarts per service; Kafka consumers tolerate brief overlap |


## Deployment Topology

Smriti is a **multi-process event-driven system**. Every deployment includes:

```mermaid
flowchart TB
  subgraph edge [Edge]
    lb[Load balancer / ingress]
  end

  subgraph apps [Application tier]
    api[api x N]
    ew[embedding-worker]
    iw[importance-worker]
    sw[summarizer-worker]
    cw[consolidation-worker]
    pw[profile-worker]
    sch[scheduler x 1]
  end

  subgraph data [Data tier]
    pg[(Postgres + pgvector)]
    rd[(Redis)]
    kf[Kafka]
  end

  subgraph obs [Observability]
    otel[OTel Collector]
    prom[Prometheus]
    graf[Grafana]
  end

  lb --> api
  api --> pg
  api --> rd
  api --> kf
  ew --> pg
  ew --> kf
  iw --> pg
  iw --> kf
  sw --> pg
  sw --> kf
  cw --> pg
  cw --> kf
  pw --> pg
  pw --> kf
  sch --> pg
  sch --> kf
  api --> otel
  ew --> otel
  otel --> prom
  prom --> graf
```



**Critical dependency:** the API is synchronous for retrieval but **asynchronous for memory enrichment**. Workers must be running for memories to reach `active` status and become searchable.

## Environments


| Environment    | Purpose              | Infra                                      | Apps                            | Notes                                                            |
| -------------- | -------------------- | ------------------------------------------ | ------------------------------- | ---------------------------------------------------------------- |
| **Local**      | Developer machines   | `infra/docker/docker-compose.yml`          | `pnpm dev:`* or compose overlay | See [local-development-runbook.md](local-development-runbook.md) |
| **CI**         | PR validation        | Ephemeral Docker in GitHub Actions         | Build only (no deploy)          | `.github/workflows/ci.yml`                                       |
| **Staging**    | Pre-prod integration | Managed or self-hosted mirror of prod      | Full stack containers           | Use real OpenAI keys optionally                                  |
| **Production** | Live traffic         | Managed Postgres, Redis, Kafka recommended | Container orchestrator          | `NODE_ENV=production`, `API_KEY` required                        |


## Container Images

### API

- **Dockerfile:** `apps/api/Dockerfile`
- **Build:** esbuild bundle → `node dist/main.js`
- **Expose:** `3000`
- **Health:** `GET /health/live`, `GET /health/ready`

### Workers (shared pattern)

- **Dockerfile:** `apps/worker.Dockerfile`
- **Build arg:** `WORKER=<app-name>` (e.g. `embedding-worker`, `scheduler`)
- **Metrics:** set `WORKER_METRICS_PORT` per container when scraping Prometheus

Build all images from the repo root:

```bash
docker build -f apps/api/Dockerfile -t smriti-api:latest .
docker build -f apps/worker.Dockerfile --build-arg WORKER=embedding-worker -t smriti-embedding-worker:latest .
docker build -f apps/worker.Dockerfile --build-arg WORKER=importance-worker -t smriti-importance-worker:latest .
docker build -f apps/worker.Dockerfile --build-arg WORKER=summarizer-worker -t smriti-summarizer-worker:latest .
docker build -f apps/worker.Dockerfile --build-arg WORKER=consolidation-worker -t smriti-consolidation-worker:latest .
docker build -f apps/worker.Dockerfile --build-arg WORKER=profile-worker -t smriti-profile-worker:latest .
docker build -f apps/worker.Dockerfile --build-arg WORKER=scheduler -t smriti-scheduler:latest .
```

CI already validates API and embedding-worker image builds on every push to `main`.

## Docker Compose (full stack)

Two compose files layer together:


| File                                   | Contents                                                    |
| -------------------------------------- | ----------------------------------------------------------- |
| `infra/docker/docker-compose.yml`      | Postgres, Redis, Kafka, Prometheus, Grafana, OTel Collector |
| `infra/docker/docker-compose.apps.yml` | API + all workers                                           |


### Recommended bring-up order

```bash
# 1. Infrastructure (creates network smriti_default)
pnpm infra:up

# 2. Wait for Kafka (~10–15s on cold start)
sleep 15

# 3. Run migrations (one-off job or init container)
export POSTGRES_URL=postgres://smriti:smriti@localhost:55432/smriti
pnpm db:migrate

# 4. Application tier
docker compose -f infra/docker/docker-compose.apps.yml up -d --build

# 5. Smoke test
pnpm e2e:smoke
```

**Kafka topics:** auto-creation is enabled in local Kafka, but new topics (e.g. `memory-updated`) may not exist until the first publish or an explicit create. If workers fail with `UNKNOWN_TOPIC_OR_PARTITION` on startup, wait for Kafka to be healthy and restart workers.

**Network:** `docker-compose.apps.yml` expects the external network `smriti_default` created by the infra compose project.

## CI/CD Pipeline

Current GitHub Actions workflow (`.github/workflows/ci.yml`):

```mermaid
flowchart LR
  pr[Pull request / push] --> verify[verify job]
  pr --> integration[integration job]
  main[Push to main] --> docker[docker-build job]

  verify --> typecheck
  verify --> lint
  verify --> test
  verify --> build

  integration --> compose[Docker infra up]
  integration --> migrate[db:migrate]
  integration --> inttest[Postgres integration tests]

  docker --> apiImg[Build API image]
  docker --> workerImg[Build embedding-worker image]
```



### Recommended evolution (not yet automated)

1. **Publish** images to a registry (GHCR, ECR, ACR) tagged with git SHA and semver.
2. **Deploy** staging on merge to `main`; production on release tag or manual approval.
3. **Run migrations** as a Kubernetes Job / ECS one-off task **before** rolling app updates.
4. **Gate production** on green integration + e2e smoke against staging.

## Deployment Procedure (production)

### Phase 1 — Prepare configuration

Copy `.env.example` to a secrets store or environment-specific file. Production **must** set:


| Variable                      | Requirement                                               |
| ----------------------------- | --------------------------------------------------------- |
| `NODE_ENV`                    | `production`                                              |
| `API_KEY`                     | Required (enforced at startup)                            |
| `POSTGRES_URL`                | Managed Postgres with pgvector                            |
| `REDIS_URL`                   | Managed Redis                                             |
| `KAFKA_BROKERS`               | Managed or self-hosted Kafka cluster                      |
| `OPENAI_API_KEY`              | When `EMBEDDING_PROVIDER=openai` or `LLM_PROVIDER=openai` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Your collector endpoint                                   |


Use distinct credentials and connection strings per environment. Never commit `.env` with secrets.

### Phase 2 — Database migration

Run migrations **once per release**, before new app versions serve traffic:

```bash
pnpm db:migrate
```

Migrations are idempotent (`schema_migrations` table tracks applied files). Run from a CI job or init container with network access to Postgres only.

### Phase 3 — Roll out application tier

**Recommended order** to minimize transient errors:

1. **Workers** (embedding, importance, summarizer, consolidation, profile)
2. **Scheduler** (single instance — do not scale horizontally without leader election)
3. **API** (horizontally scalable behind a load balancer)

**Rolling update pattern:** deploy one service at a time; wait for health/metrics before the next. Kafka consumer groups tolerate brief overlap during rolling worker restarts.

**Scheduler constraint:** run exactly **one** scheduler instance. Multiple schedulers will duplicate fan-out events (harmless but wasteful due to idempotency, still avoid in production).

### Phase 4 — Verify


| Check             | Command / endpoint                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| API liveness      | `GET /health/live` → 200                                                                           |
| API readiness     | `GET /health/ready` → postgres + redis true                                                        |
| End-to-end flow   | `pnpm e2e:smoke` against deployed API URL                                                          |
| Worker throughput | Grafana dashboard `Smriti Overview` (`infra/grafana/provisioning/dashboards/smriti-overview.json`) |
| DLQ depth         | Monitor `events_dlq_total` metric                                                                  |


## Scaling Guidelines


| Component                                | Scale strategy                  | Notes                                                            |
| ---------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| **api**                                  | Horizontal (stateless)          | Sticky sessions not required; auth via `x-user-id` + `x-api-key` |
| **embedding-worker**                     | Horizontal                      | Same consumer group; partitions limit max parallelism            |
| **importance-worker**                    | Horizontal                      | Same pattern as embedding                                        |
| **summarizer / consolidation / profile** | Horizontal                      | Idempotent via `processed_events`                                |
| **scheduler**                            | **Single instance**             | One cron-like fan-out source                                     |
| **Postgres**                             | Vertical + read replicas later  | Vector search is read-heavy on `/memories/context`               |
| **Redis**                                | Vertical or cluster             | Working memory + context cache                                   |
| **Kafka**                                | Cluster with ≥3 brokers in prod | Increase partitions for hot topics (`memory-created`)            |


## Security in Production

- **API key:** set `API_KEY`; clients send `x-api-key` header (see `libs/auth`).
- **Rate limiting:** `@nestjs/throttler` defaults — tune `RATE_LIMIT_TTL_MS` and `RATE_LIMIT_MAX`.
- **Network:** API is the only public-facing service; workers and data stores live on private networks.
- **Secrets:** inject via orchestrator secrets (K8s Secrets, AWS SSM, etc.), not baked into images.

## Observability


| Signal     | Source                                                                        | Access                        |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------- |
| Metrics    | Prometheus scrape (`/metrics` on API; workers when `WORKER_METRICS_PORT > 0`) | `:9090` locally               |
| Dashboards | Grafana provisioning                                                          | `:3001` locally (admin/admin) |
| Traces     | OTLP → OTel Collector → backend                                               | `:4318` HTTP                  |


Propagate `x-request-id` from clients; memory write paths attach W3C `traceparent` to Kafka events for cross-service correlation.

## Rollback Strategy

1. **Application rollback:** redeploy previous image tag (API + workers together if schema-compatible).
2. **Database rollback:** forward-only migrations — plan additive schema changes; avoid destructive migrations without a maintenance window.
3. **Kafka:** consumers resume from committed offsets; no rollback needed for event topics.
4. **Partial failure:** if only workers regress, roll back worker images while keeping API; memories stay `pending` until workers recover.

## Managed-Service Mapping (production target)

For a production deployment outside Docker Compose, replace local infra with:


| Local (compose)           | Production alternative                         |
| ------------------------- | ---------------------------------------------- |
| pgvector container        | RDS/Aurora Postgres + pgvector, Neon, Supabase |
| Redis container           | ElastiCache, Redis Cloud, Upstash              |
| Confluent Kafka container | Confluent Cloud, MSK, Redpanda, Aiven          |
| Prometheus/Grafana        | Grafana Cloud, Datadog, or self-hosted on K8s  |
| OTel Collector            | Vendor agent or Grafana Alloy                  |


Application containers deploy unchanged to **Kubernetes**, **ECS/Fargate**, **Fly.io**, or **Railway** — only connection strings and secrets change.

## Kubernetes sketch (optional path)

Typical manifest split:

- **Deployments:** `api` (replicas: 2+), each worker type, `scheduler` (replicas: 1)
- **Services:** ClusterIP for API; headless or ClusterIP for worker metrics
- **Ingress:** TLS termination → API service
- **Jobs:** `db-migrate` per release
- **ConfigMaps:** non-secret env; **Secrets:** `API_KEY`, `OPENAI_API_KEY`, DB URLs

Use liveness (`/health/live`) and readiness (`/health/ready`) probes on the API deployment.

## Pre-release checklist

- CI green (`verify`, `integration`, `docker-build`)
- Migrations applied to target database
- `API_KEY` and provider keys set for production
- All seven app containers running (1 API + 5 workers + 1 scheduler)
- Kafka topics reachable; workers log `consumer started`
- `pnpm e2e:smoke` passes against deployed URL
- Grafana dashboards receiving metrics
- DLQ rate near zero after soak period

## Related docs

- [Local development runbook](local-development-runbook.md) — day-to-day dev setup
- [Event-driven design](architecture/event-driven-design.md) — Kafka topics and worker contracts
- [Observability design](architecture/observability-design.md) — metrics and tracing details
- [Database design](architecture/database-design.md) — schema and migration notes

