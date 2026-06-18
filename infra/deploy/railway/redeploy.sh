#!/usr/bin/env bash
# Redeploy Smriti services on Railway (workers → scheduler → api).
# Each Railway service must use the matching GHCR image (see README.md).
set -euo pipefail

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "RAILWAY_TOKEN is required" >&2
  exit 1
fi

project_args=()
if [[ -n "${RAILWAY_PROJECT_ID:-}" ]]; then
  project_args+=(--project "$RAILWAY_PROJECT_ID")
fi
if [[ -n "${RAILWAY_ENVIRONMENT:-}" ]]; then
  project_args+=(--environment "$RAILWAY_ENVIRONMENT")
fi

services=(
  embedding-worker
  importance-worker
  summarizer-worker
  consolidation-worker
  profile-worker
  scheduler
  api
)

for service in "${services[@]}"; do
  echo "Redeploying ${service}..."
  railway redeploy "${project_args[@]}" --service "$service" --yes
done

echo "All services redeployed."
