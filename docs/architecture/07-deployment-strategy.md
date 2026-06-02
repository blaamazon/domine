# Deployment Strategy

## 1. Infrastructure Architecture

### 1.1 Environment Tiers

| Environment | Purpose | Infrastructure | Database | Deploy Trigger |
|-------------|---------|---------------|----------|----------------|
| `development` | Individual dev testing | Local Docker Compose / Railway preview | Neon branch (ephemeral) | PR creation |
| `staging` | Integration testing | Railway / Fly.io staging | Neon staging DB | PR merge to `develop` |
| `production` | Live customer traffic | AWS ECS / DigitalOcean K8s | Neon production / AWS RDS | Release tag on `main` |

### 1.2 Network Topology (Production)

```
                          ┌──────────┐
                          │ Cloudflare│
                          │  (CDN +   │
                          │  WAF + DNS)│
                          └────┬─────┘
                               │
                          ┌────▼─────┐
                          │  ALB /    │
                          │  Nginx    │
                          │  Ingress  │
                          └────┬─────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
              ┌─────▼──┐ ┌────▼───┐ ┌───▼──────┐
              │ Frontend│ │ Backend│ │ Admin     │
              │ Pods    │ │ Pods   │ │ Dashboard │
              └────┬────┘ └────┬───┘ └────┬─────┘
                   │           │           │
                   └───────────┼───────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Private VPC       │
                    │                     │
                    │  ┌─────┐ ┌───────┐  │
                    │  │  PG  │ │ Redis │  │
                    │  │  RDS │ │Elasti-│  │
                    │  │      │ │ cache │  │
                    │  └─────┘ └───────┘  │
                    │                     │
                    │  ┌─────┐ ┌───────┐  │
                    │  │ SQS │ │  S3   │  │
                    │  │Queue│ │ Bucket│  │
                    │  └─────┘ └───────┘  │
                    └─────────────────────┘
```

## 2. CI/CD Pipeline

### 2.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx turbo lint typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: domine_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: [5432:5432]
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npx turbo test -- --coverage
      - uses: codecov/codecov-action@v3

  build-and-push:
    needs: [lint-and-typecheck, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          docker build -t domine/api:${{ github.sha }} -f packages/backend/Dockerfile .
          docker tag domine/api:${{ github.sha }} domine/api:latest
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - run: |
          docker push ghcr.io/domine/api:${{ github.sha }}
          docker push ghcr.io/domine/api:latest

  deploy-staging:
    needs: [build-and-push]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: |
          # Deploy to Railway/Fly.io via Deploy Hook
          curl -X POST ${{ secrets.RAILWAY_DEPLOY_HOOK }}

  deploy-production:
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main' && startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: |
          # K8s rolling update
          kubectl set image deployment/api domine-api=ghcr.io/domine/api:${{ github.sha }}
          kubectl rollout status deployment/api
```

### 2.2 Database Migrations in CI/CD

```yaml
# Migration step runs before deploy
- name: Run Database Migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    npx prisma migrate deploy
```

**Migration safety rules:**
- All migrations must be backward-compatible (no breaking changes)
- Rollback scripts must be provided for each migration
- Schema changes and code changes are deployed separately (migrations first, then code)
- Use `expand-and-contract` pattern for column renames

## 3. Containerization

### 3.1 Dockerfile (Backend)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json ./
COPY packages/backend packages/backend
COPY packages/shared packages/shared
RUN npm ci
RUN npx turbo build --filter=@domine/backend

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/main"]
```

### 3.2 Docker Compose (Local Development)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: domine
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports: [5432:5432]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: [6379:6379]

  api:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile.dev
    volumes:
      - ./packages/backend:/app/packages/backend
      - ./packages/shared:/app/packages/shared
    ports: [3000:3000]
    env_file: .env.development
    depends_on: [postgres, redis]

  worker:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile.worker
    volumes:
      - ./packages/backend:/app/packages/backend
    env_file: .env.development
    depends_on: [postgres, redis, api]
    command: node dist/workers/content-worker

  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile.dev
    volumes:
      - ./packages/frontend:/app/packages/frontend
    ports: [5173:5173]
    depends_on: [api]

volumes:
  pgdata:
```

## 4. Monitoring & Observability

### 4.1 Logging

- **Structured JSON logging** — all services log JSON to stdout
- **Log shipping** — Vector or Fluentd → Loki → Grafana
- **Searchable fields**: request_id, service, module, duration_ms, status_code, tenant_id
- **Sample config** (NestJS logger):

```typescript
const logger = new Logger('ProductService');
logger.log({
  event: 'product.created',
  product_id: product.id,
  org_id: product.organization_id,
  type: product.product_type,
  duration_ms: Date.now() - start,
});
```

### 4.2 Metrics

| Metric | Type | Source | Alert Threshold |
|--------|------|--------|-----------------|
| `http_requests_total` | Counter | API Gateway | P99 > 500ms |
| `http_request_duration_ms` | Histogram | API Gateway | P99 > 2s |
| `active_users` | Gauge | Auth Service | — |
| `products_published_total` | Counter | Product Service | — |
| `content_processing_duration` | Histogram | Content Pipeline | P95 > 5min |
| `email_send_failures_total` | Counter | Email Worker | > 1% failure rate |
| `marketplace_sync_failures` | Counter | Market Connector | > 5 consecutive failures |
| `lead_capture_rate` | Gauge | Marketing Engine | Drop > 50% |
| `queue_depth` | Gauge | Each worker | > 10k unprocessed |
| `revenue_mrr_cents` | Gauge | Billing | — |

### 4.3 Health Checks

```json
// GET /health → 200 OK
{
  "status": "healthy",
  "version": "1.2.3",
  "uptime_seconds": 123456,
  "checks": {
    "database": {"status": "up", "latency_ms": 5},
    "redis": {"status": "up", "latency_ms": 2},
    "s3": {"status": "up", "latency_ms": 15},
    "queue": {"status": "up", "depth": 123}
  }
}

// GET /ready → 200 OK (only when all dependencies are available)
```

### 4.4 Alerting

| Alert | Condition | Severity | Channel |
|-------|-----------|----------|---------|
| API P99 latency spike | > 2s for 5 min | Critical | PagerDuty + Slack |
| Database CPU > 80% | > 80% for 10 min | Critical | PagerDuty + Slack |
| Queue depth growing | Depth > 10k and increasing | Warning | Slack |
| Marketplace sync failure | > 5 consecutive failures | Warning | Slack + Email |
| Email bounce rate > 2% | > 2% in 1 hour | Warning | Slack |
| Error rate > 1% | > 1% of requests fail for 5 min | Critical | PagerDuty |

## 5. Backup & Disaster Recovery

### 5.1 Database Backups

- **Automated daily snapshots** (RDS automated backups, 7-day retention)
- **Point-in-time recovery** (ability to restore to any point in last 7 days)
- **Weekly export** to S3 for long-term archival
- **Cross-region replica** for disaster recovery (Phase 3)

### 5.2 Disaster Recovery Plan

| Scenario | RTO | RPO | Recovery Steps |
|----------|-----|-----|----------------|
| Single instance failure | < 5 min | 0 (stateless) | K8s reschedules pod |
| AZ outage | < 30 min | < 5 min | Multi-AZ DB failover, spread pods |
| Entire region outage | < 4 hr | < 1 hr | DNS failover to DR region, DB from snapshot |
| Data corruption | < 2 hr | < 24 hr | Point-in-time recovery |
| Security incident | < 1 hr | N/A | Isolate + rotate all credentials + incident response |

## 6. Security Deployment

### 6.1 Secrets Management

- **HashiCorp Vault** (self-hosted or HCP Vault) for secret storage
- **K8s External Secrets Operator** to sync Vault secrets to K8s secrets
- **No secrets in code** — all credentials injected at deploy time
- **Secret rotation**: automated rotation schedule (30-90 days per service)

### 6.2 Network Security

- **Zero-trust network**: all inter-service communication requires mTLS
- **VPC isolation**: database and queue in private subnets, no public access
- **WAF**: Cloudflare WAF rules blocking SQL injection, XSS, path traversal
- **DDoS protection**: Cloudflare + rate limiting at API Gateway
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options on all responses

### 6.3 Application Security

- **Dependency scanning**: Dependabot + Snyk in CI pipeline
- **SAST**: Semgrep rules in CI
- **DAST**: OWASP ZAP scan on staging weekly
- **Pen testing**: Annual third-party penetration test (> $50k MRR trigger)
- **Bug bounty**: HackerOne/Intigriti program at launch

## 7. Scaling Strategy

### 7.1 Horizontal Scaling

| Component | Scaling Trigger | Strategy |
|-----------|----------------|----------|
| API pods | CPU > 70% or memory > 80% | HPA (Horizontal Pod Autoscaler) |
| Content workers | Queue depth > 1000 | KEDA (queue-based scaling) |
| Email workers | Queue depth > 500 | KEDA (queue-based scaling) |
| Database | Connection pool exhaustion | PgBouncer + read replicas |
| Redis | Memory > 80% | Cluster mode sharding |

### 7.2 Vertical Scaling Limits

| Service | Max Memory | Max CPU | Notes |
|---------|------------|---------|-------|
| API | 1GB | 1 vCPU | Stateless, scales out |
| Content worker | 4GB | 2 vCPU | Heavy processing (PDF gen, OCR) |
| Email worker | 512MB | 0.5 vCPU | I/O bound |
| Analytics worker | 2GB | 1 vCPU | Aggregation queries |
| Scheduler | 512MB | 0.5 vCPU | Lightweight |

### 7.3 Database Scaling Path

```
Phase 1: Single Supabase/Neon instance
Phase 2: Neon with read replicas (analytics queries to replica)
Phase 3: Shard by organization_id (multi-region)
         → analytics events to ClickHouse for time-series
         → full-text search to Elasticsearch or Meilisearch
```

## 8. Release Strategy

### 8.1 Versioning

- **Semantic versioning**: `MAJOR.MINOR.PATCH` (v1.2.3)
- **MAJOR**: Breaking API changes
- **MINOR**: New features, backward-compatible
- **PATCH**: Bug fixes, security patches

### 8.2 Release Cadence

- **Patch releases**: As needed (hotfix, security)
- **Minor releases**: Every 2 weeks
- **Major releases**: Every 3-6 months (with 3-month deprecation warning)
- **Release window**: Tuesday/Thursday 10-11 AM UTC (avoid Mon/Fri)

### 8.3 Deployment Strategy

| Phase 1-2 | Phase 3+ |
|-----------|----------|
| Single rolling deploy | Blue-green deployment |
| 5-minute deployment window | 15-minute deployment |
| Manual approval gate | Automated canary (10% → 50% → 100%) |
| Feature flags (LaunchDarkly) | Feature flags + progressive rollout |

### 8.4 Rollback Procedure

```
1. Tag current healthy deployment as `last-stable`
2. On alert: `kubectl rollout undo deployment/api`
3. Verify health check passes
4. If DB migration rolled out, run down migration
5. Post-mortem within 24 hours
```

## 9. Cost Optimization

| Strategy | Saving | Implementation |
|----------|--------|----------------|
| Right-size instances | 20-40% | Monitor CPU/memory and downsize over-provisioned instances |
| Reserved instances | 30-60% | 1-year commitment for baseline load |
| Spot instances | 60-80% | Content pipeline workers on spot |
| S3 lifecycle policies | 40% | Auto-tier infrequently accessed data to Glacier |
| Database connection pooling | Reduced waste | PgBouncer to reduce open connections |
| CDN caching | 70% bandwidth | Cache static assets at edge via Cloudflare |
| Scale-to-zero | 100% when idle | Neon dev databases, dev/lower environments