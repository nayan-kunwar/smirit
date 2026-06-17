-- Enable pgvector. Provided by the pgvector/pgvector image.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memories (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK (type IN ('working','episodic','semantic')),
  content     TEXT NOT NULL,
  importance  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','active','archived','deleted')),
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_memories_user_active
  ON memories (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_status ON memories (status);

CREATE TABLE IF NOT EXISTS memory_embeddings (
  memory_id     UUID PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  dimensions    INTEGER NOT NULL,
  embedding     VECTOR(1536) NOT NULL,
  content_hash  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_embeddings_ann
  ON memory_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS memory_summaries (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id),
  summary       TEXT NOT NULL,
  summary_type  TEXT NOT NULL DEFAULT 'rolling',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_summaries_user
  ON memory_summaries (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id     UUID PRIMARY KEY REFERENCES users(id),
  profile     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id        TEXT NOT NULL,
  consumer_group  TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, consumer_group)
);
