# Development Roadmap

Delivery is phased so each step produces something runnable and testable. Phases
build on each other; quality gates apply at every phase.

## Phase 0 - Documentation and Architecture

- Author architecture docs under `docs/architecture/` (this set).
- Lock in technology choices: Nx + pnpm, NestJS + Fastify, Kysely, Postgres +
  pgvector, Redis, Kafka, OpenTelemetry/Prometheus/Grafana.

Exit criteria: architecture reviewed; module boundaries agreed.

## Phase 1 - Monorepo Foundation

- Nx + pnpm workspace, strict TypeScript, ESLint + Prettier.
- Module boundary tags and lint rules.
- Base Docker Compose for Postgres, Redis, Kafka, Prometheus, Grafana, OTel.
- `libs/config` with validated environment configuration.

Exit criteria: `pnpm install`, lint, and typecheck pass on an empty graph;
`docker compose up` starts infrastructure.

## Phase 2 - Apps and Libraries Scaffolding

- Generate apps: `api`, `embedding-worker`, `importance-worker`,
  `summarizer-worker`, `consolidation-worker`, `profile-worker`, `scheduler`.
- Generate libraries: `memory-core`, `retrieval-core`, `ranking`, `embedding`,
  `postgres`, `redis`, `kafka`, `events`, `auth`, `observability`,
  `shared-types`, `testing`.
- Wire tags so boundary rules are enforced.

Exit criteria: project graph builds; boundary violations fail lint.

## Phase 3 - Core Memory API

- `POST /memories`, `GET /users/:id/memories`, `DELETE /memories/:id`.
- Postgres persistence via Kysely repositories.
- Redis working memory.
- Publish `memory-created` / `memory-deleted`.
- Unit tests for use cases; integration tests for repositories.

Exit criteria: create/list/delete work end-to-end against Dockerized infra.

## Phase 4 - Embeddings and pgvector

- `EmbeddingProvider` port + OpenAI and mock implementations.
- `memory_embeddings` table and migrations.
- `embedding-worker` consuming `memory-created`.
- Vector search query in `libs/postgres`.

Exit criteria: creating a memory results in a stored embedding; vector search
returns ranked candidates.

## Phase 5 - Retrieval Pipeline

- `POST /memories/context` synchronous endpoint.
- `libs/retrieval-core` pipeline: cache -> embed -> search -> rank -> build.
- `libs/ranking` pure scoring with tunable weights.
- Context cache in Redis.

Exit criteria: retrieval returns relevant top-5 context with measured latency.

## Phase 6 - Kafka Workers

- `importance-worker`, `summarizer-worker`, `consolidation-worker`,
  `profile-worker`, `scheduler`.
- Idempotent consumers, retry topics, DLQs.
- Follow-up events (`memory-scored`, `summary-generated`, `profile-generated`).

Exit criteria: background processing is idempotent and resilient; DLQ verified.

## Phase 7 - Production Hardening

- OpenTelemetry traces end-to-end; Prometheus metrics; Grafana dashboards.
- Structured logging, correlation IDs, rate limiting, health/readiness.
- Integration test suite against Docker services.
- CI: lint, typecheck, test, build using Nx affected.

Exit criteria: dashboards populated; CI green; services containerized.

## Quality Gates (every phase)

- `pnpm nx affected -t typecheck lint test build` passes.
- No circular dependencies in the Nx project graph.
- New code has tests; domain logic is covered by unit tests.

## Tracking

| Phase           | Status |
| --------------- | ------ |
| 0 - Docs        | Done   |
| 1 - Foundation  | Done   |
| 2 - Scaffolding | Done   |
| 3 - Core API    | Done   |
| 4 - Embeddings  | Done   |
| 5 - Retrieval   | Done   |
| 6 - Workers     | Done   |
| 7 - Hardening   | Done   |
