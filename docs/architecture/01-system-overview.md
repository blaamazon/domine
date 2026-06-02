# System Overview & Service Decomposition

## 1. High-Level Architecture

Domine follows a **microservice architecture** driven by asynchronous events. Each service is independently deployable, owns its data store (shared PostgreSQL but separate schemas/logical DBs), and communicates via message queues for async workloads and REST/gRPC for synchronous requests.

### Architecture Diagram (ASCII)

```
┌───────────────────────────────────────────────────────────────────┐
│                          C L I E N T   L A Y E R                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Web Dashboard│  │  Mobile App  │  │  Public API  │             │
│  │  (React SPA) │  │ (React Native)│  │  (Headless)  │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
└─────────┼──────────────────┼─────────────────┼─────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                   G A T E W A Y   L A Y E R                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  API Gateway │  │  WAF / CDN   │  │  Rate Limiter│             │
│  │(Kong/Traefik)│  │   (CloudFlare)│  │  (per-tenant)│             │
│  └──────┬───────┘  └──────────────┘  └──────────────┘             │
└─────────┼──────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────┐
│              S E R V I C E   L A Y E R   (K8s / Nomad)            │
│                                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │  Auth    │ │  User    │ │ Product  │ │ Content  │ │ Market   ││
│  │ Service  │ │ Service  │ │ Service  │ │ Pipeline │ │ Connector││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │Marketing │ │Analytics │ │Billing   │ │Scheduler │             │
│  │ Engine   │ │ Service  │ │ Service  │ │Service   │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
└───────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
│   Event Bus      │ │   Object Store  │ │     Databases          │
│ (RabbitMQ/Redis) │ │  (S3/MinIO)     │ │  PostgreSQL + Redis    │
│                  │ │                 │ │  (per-service schemas) │
└──────────────────┘ └──────────────────┘ └────────────────────────┘
```

## 2. Service Decomposition

### 2.1 API Gateway (Kong / Traefik)
- **Role**: Single entry point, authentication, rate limiting, request validation, routing
- **Auth**: Validates JWT tokens, proxies OAuth2 flows (Google, GitHub login)
- **Routing**: Path-based routing to microservices (e.g., `/api/v1/products/*` → Product Service)
- **Rate Limiting**: Tier-based (free: 100 req/hr, pro: 1000 req/hr, enterprise: custom)
- **Logging**: Structured access logs → ELK stack

### 2.2 Auth Service
- **Role**: User authentication, session management, API key generation
- **Endpoints**: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`
- **OAuth2**: Google, GitHub, Apple SSO integration
- **JWT**: Short-lived access tokens (15 min) + long-lived refresh tokens (30 days)
- **API Keys**: For programmatic access; scoped per-tenant with granular permissions

### 2.3 User Service
- **Role**: Account management, team/org management, profiles, notification preferences
- **Endpoints**: `CRUD /users/*`, `CRUD /organizations/*`, `GET/PUT /settings`
- **Team/RBAC**: Owner → Admin → Member → Viewer roles
- **Billing**: Integrates with Stripe for subscription management; exposes usage data to Billing Service

### 2.4 Product Service
- **Role**: Product lifecycle management — draft, review, publish, archive
- **Endpoints**: `CRUD /products/*`, `POST /products/:id/publish`, `POST /products/:id/archive`
- **Product types**: eBook (PDF/EPUB), Print-on-demand, Art print, Audio (MP3), Bundle
- **Variants**: Different formats of the same product (PDF vs EPUB vs paperback)
- **Versioning**: Track content revisions; published products are immutable snapshots
- **Metadata**: Title, description, author (public domain attribution), categories, tags, ISBN/handle

### 2.5 Content Pipeline Service
- **Role**: Discover, download, process, and package public-domain content
- **Sources**: Project Gutenberg, Wikimedia Commons, Internet Archive, Library of Congress, Musopen, PubMed Central
- **Processors**: Text normalization → format conversion (Markdown → EPUB/PDF) → metadata extraction
- **Packaging**: Apply templates (covers, formatting, branding) → generate sellable files
- **Output**: Stores processed artifacts in S3 with content-hash-based deduplication
- *See `05-content-pipeline.md` for full design*

### 2.6 Marketplace Connector Service
- **Role**: Publish products to external marketplaces via adapter pattern
- **Connectors**: Amazon KDP, Etsy, Shopify, Gumroad, eBay, Creative Market
- **Operations**: Create listing → update inventory → sync orders → reconcile status
- **Retry/Backoff**: Exponential backoff for API rate limits and transient failures
- **Webhook handling**: Receives marketplace callbacks (order placed, listing rejected)
- **Inventory sync**: Bidirectional — stock changes in Domine propagate to marketplaces and vice versa
- *See `03-api-design.md` for connector interface specification*

### 2.7 Marketing Engine Service
- **Role**: Lead capture, audience segmentation, campaign execution, analytics
- **Sub-modules**:
  - **Lead Capture**: Landing pages, pop-ups, lead magnets, referral tracking
  - **Segmentation Engine**: Rule-based and behavior-based segment building
  - **Campaign Orchestrator**: Multi-step sequences (email + social + retargeting)
  - **Content Generator**: AI-assisted social posts, blog posts, email copy
  - **Schedule & Send**: Social media scheduling (Buffer/Twitter API integration), email delivery (SendGrid/Mailgun)
  - **Purchase Reminders**: Abandoned cart, browse abandonment, re-engagement
- **Attribution**: First-touch, last-touch, and multi-touch attribution models
- *See `04-marketing-engine.md` for full design*

### 2.8 Analytics Service
- **Role**: Event collection, aggregation, reporting, dashboards
- **Events**: Page views, lead captures, email opens/clicks, social impressions, purchases, refunds
- **Pipelines**: Real-time (Redis streams) for dashboards + batch (dbt/Spark) for deep analysis
- **Dashboards**: Real-time user-facing dashboards via Materialized Views
- **Product analytics**: Per-product sales, conversion funnel, marketplace performance comparison

### 2.9 Billing Service
- **Role**: Subscription management, usage metering, invoicing
- **Integration**: Stripe (subscriptions, payment methods, invoices)
- **Usage tracking**: Metered billing per-product, per-marketplace connection
- **Tier enforcement**: Gated feature access based on subscription tier

### 2.10 Scheduler / Orchestrator Service
- **Role**: Cron-like job scheduling, workflow orchestration
- **Jobs**: Content discovery (daily/weekly), marketplace sync (hourly), campaign execution (scheduled), report generation (weekly)
- **Orchestration**: DAG-based workflow for multi-step processes (e.g., discover→download→process→package→publish)
- **Resilience**: Retry with backoff, dead-letter queues, job timeout enforcement
- **Technology**: Temporal.io or Apache Airflow

## 3. Inter-Service Communication

### 3.1 Synchronous (REST/gRPC)
- Client → Service: REST/JSON via API Gateway
- Service → Service: gRPC for internal high-throughput calls (e.g., Product Service querying Content Pipeline for status)
- Prefer gRPC for latency-sensitive internal calls; REST for external-facing APIs

### 3.2 Asynchronous (Event Bus)
- **Event Schema**: CloudEvents 1.0 specification
- **Events**:
  | Event | Producer | Consumers |
  |---|---|---|
  | `product.created` | Product Service | Market Connector, Marketing Engine, Analytics |
  | `product.published` | Product Service | Market Connector, Marketing Engine |
  | `content.discovered` | Content Pipeline | Product Service, Scheduler |
  | `content.processed` | Content Pipeline | Product Service |
  | `marketplace.listing.created` | Market Connector | Product Service, Analytics |
  | `marketplace.order.received` | Market Connector (webhook) | Product Service, Billing, Analytics |
  | `lead.captured` | Marketing Engine | Analytics, User Service |
  | `campaign.completed` | Marketing Engine | Analytics, Scheduler |

### 3.3 Message Queue Topology
- **Exchange types**: Topic exchanges for routing events by type
- **Queue binding**: Each consumer binds to relevant topics
- **Dead-letter**: Failed messages go to DLQ with TTL + retry policy
- **Idempotency**: Event IDs ensure at-least-once delivery without duplication

## 4. Data Domains & Ownership

| Domain | Owner | Store | Notes |
|---|---|---|---|
| Identity & Auth | Auth Service | PostgreSQL (shared cluster, separate schema `auth`) | Passwords hashed with bcrypt |
| Users & Orgs | User Service | PostgreSQL (`users`) | + Stripe customer records |
| Products | Product Service | PostgreSQL (`products`) | File refs in S3 |
| Content | Content Pipeline | PostgreSQL (`content`) + S3 | Content-addressable storage |
| Marketplace | Market Connector | PostgreSQL (`marketplace`) | Per-connector state |
| Marketing | Marketing Engine | PostgreSQL (`marketing`) + Redis | Segments, campaigns, events |
| Analytics | Analytics Service | PostgreSQL (`analytics`) + ClickHouse (optional) | Event stream |
| Billing | Billing Service | PostgreSQL (`billing`) + Stripe | Subscription records |
| Scheduling | Scheduler | PostgreSQL (`scheduler`) + Redis | Job definitions & state |

## 5. Resilience & Reliability

- **Circuit breakers**: All inter-service HTTP/gRPC calls wrapped with circuit breaker (e.g., Opossum for Node, Hystrix-style for Go)
- **Retry policy**: Max 3 retries with exponential backoff (100ms → 500ms → 2s)
- **Bulkheads**: Each service has a dedicated connection pool — failure in one service does not cascade
- **Graceful degradation**: If Marketplace Connector is down, Product remains publishable (queued for later)
- **Health checks**: `/health` and `/ready` endpoints on every service
- **Rate limiting**: Per-tenant + per-IP rate limiting at API Gateway level

## 6. Security Architecture

- **Network**: All services run in a private VPC; only API Gateway is publicly accessible
- **TLS**: End-to-end encryption (mTLS for inter-service)
- **Secrets**: HashiCorp Vault for secrets management
- **Data encryption**: AES-256 at rest (database encryption + S3 server-side encryption)
- **API security**: JWT bearer tokens + API key header validation; rate limiting per key
- **Audit trail**: All state-changing operations logged to immutable audit event stream