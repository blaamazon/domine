# Technology Stack Recommendations

## 1. Stack Philosophy

Domine's tech stack prioritizes:

1. **Developer productivity** — rapid iteration, rich ecosystem, good DX
2. **Cost efficiency** — serverless-first where sensible, avoid over-provisioning
3. **Scalability** — horizontal scaling from 0 to 10k+ tenants
4. **Operational simplicity** — minimize moving parts, managed services over self-hosted
5. **Type safety** — leverage static typing to reduce runtime errors

## 2. Stack Overview

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React + TypeScript + Vite | Fast DX, type safety, massive ecosystem |
| **Component Library** | shadcn/ui + Tailwind CSS | Accessible, customizable, tree-shakeable |
| **Mobile** | React Native (Expo) | Code sharing with web, quick MVP |
| **Backend** | Node.js + TypeScript (NestJS) | Unified language with frontend, mature framework, DI, modularity |
| **API Style** | REST (public) + gRPC (internal) | REST for wide compatibility, gRPC for perf |
| **Database** | PostgreSQL (Neon / Supabase) | Serverless PG, branching, cheap scale-to-zero |
| **Cache** | Redis (Upstash) | Serverless Redis, no infra management |
| **Message Queue** | RabbitMQ (CloudAMQP) or Redis Streams | Reliable async processing |
| **Object Storage** | S3 (AWS / Cloudflare R2) | Cheap, CDN-integrated, no egress fees with R2 |
| **Auth** | Auth0 / Clerk (managed) or NextAuth | Skip building auth infra; SOC2 compliance |
| **Email** | SendGrid + AWS SES | High deliverability + cost-effective bulk |
| **Social APIs** | Buffer API + per-platform direct APIs | Unified scheduling where possible |
| **AI/ML** | OpenAI API + Anthropic Claude | Text generation, summarization, translation |
| **Image Gen** | Stable Diffusion (Replicate) / DALL·E 3 | Cover art, social media visuals |
| **OCR** | Tesseract (open-source) / Google Cloud Vision | Text extraction from scans |
| **Media Processing** | FFmpeg (serverless + Lambda) | Audio/video conversion |
| **Document Conversion** | Pandoc + WeasyPrint / Calibre | Book format conversion |
| **Orchestration** | Temporal.io (managed) | Durable execution for content pipelines |
| **Infrastructure** | Kubernetes (DigitalOcean / Linode) or AWS ECS | Container orchestration if >$5k MRR |
| **CI/CD** | GitHub Actions | Integrated, free for private repos |
| **Monitoring** | DataDog / Grafana Cloud | APM, logs, metrics, traces |
| **CDN** | Cloudflare | Edge caching, DDoS protection, WAF |

## 3. Detailed Stack Breakdown

### 3.1 Backend — NestJS + TypeScript

**Why NestJS over alternatives:**

| Feature | NestJS | Fastify | Express | Go | Python (FastAPI) |
|---------|--------|---------|---------|-----|-------------------|
| TypeScript native | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| DI / Module system | ✅ | ❌ | ❌ | N/A | ✅ (FastAPI) |
| GraphQL ready | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| gRPC support | ✅ | ❌ | ⚠️ | ✅ | ✅ |
| OpenAPI generation | ✅ (via swagger) | ✅ | ⚠️ | ⚠️ | ✅ |
| Job scheduling | ✅ (Bull) | ⚠️ | ⚠️ | ✅ | ✅ (Celery) |
| Maturity | Medium | Medium | High | Medium | High |
| Ecosystem | Rich | Moderate | Richest | Moderate | Rich |

**Decision**: NestJS provides the best balance of structure, type safety, and ecosystem for a TypeScript monorepo. If performance becomes a bottleneck on heavy processing, migrate compute-heavy content pipeline to Go.

### 3.2 Database — PostgreSQL (Serverless)

**Why serverless PostgreSQL:**

| Feature | Neon | Supabase | AWS RDS | CockroachDB |
|---------|------|----------|---------|-------------|
| Scale-to-zero | ✅ | ✅ | ❌ | ❌ |
| Branching (dev DBs) | ✅ | ❌ | ❌ | ❌ |
| Storage limit | 500GB | 500GB | 16TB | Unlimited |
| Pricing model | Compute/hr + storage | Per-project | Provisioned | Provisioned |
| Serverless | ✅ | ⚠️ (Bouncer) | ❌ | ✅ |
| Free tier | ✅ | ✅ | ❌ | ❌ |

**Decision**: Start with **Supabase** (fastest setup, built-in auth + realtime + storage) and migrate to **Neon** if branching or finer compute control is needed for CI/CD.

### 3.3 Cache & Queue — Redis (Upstash)

**Why Upstash:**
- Serverless Redis — no server management
- Pay-per-request (ideal for variable workloads)
- REST + WebSocket APIs available
- Built-in durable Redis Streams for queuing

**Cache uses:**
- Session data (if not using Auth0)
- Product catalog cache (reduce DB load)
- Rate limiter counters
- Leaderboards/scores (lead scoring)
- Rate-limited API responses

**Queue uses:**
- Email sending queue
- Social post publishing queue
- Webhook delivery queue
- Lead scoring recalculation queue

### 3.4 AI/ML Stack

| Task | Provider | Model | Cost | Quality |
|------|----------|-------|------|---------|
| Text summarization | OpenAI | GPT-4o | $5/M tok | Excellent |
| Content generation | Anthropic | Claude 3.5 Sonnet | $3/M tok | Excellent |
| Tag/category suggestion | OpenAI | GPT-4o mini | $0.15/M tok | Good enough |
| Translation | OpenAI | GPT-4o | $5/M tok | Good |
| Cover image gen | Replicate | SDXL / FLUX | $0.013/image | Very good |
| Social image gen | OpenAI | DALL·E 3 | $0.04/image | Excellent |
| OCR | Tesseract.js | Open source | Free | Good (text) |
| Audio transcription | Whisper (Replicate) | Large-v3 | $0.006/min | Excellent |

**Cost optimization**: Use GPT-4o mini for bulk operations (tagging, categorization) and full GPT-4o/Claude only for customer-facing content (descriptions, emails, landing page copy).

### 3.5 Document Processing Stack

| Tool | Purpose | License | Notes |
|------|---------|---------|-------|
| Pandoc | Universal document converter | GPLv2 | Text/MD → EPUB, PDF, HTML |
| WeasyPrint | HTML → PDF with CSS | BSD | High-quality print PDFs |
| Calibre (ebook-convert) | EPUB/MOBI conversion | GPLv3 | Best for Kindle format |
| Tesseract | OCR engine | Apache 2.0 | + tessdata for 100+ languages |
| ImageMagick | Image processing | Apache 2.0 | Resize, format convert, color profile |
| FFmpeg | Audio/video processing | LGPL/GPL | All media format conversions |
| LilyPond | Sheet music engraving | GPLv3 | Print-ready sheet music |
| Pillow | Python image library | HPND | Cover generation, image manipulation |

### 3.6 Infrastructure

#### Phase 1 — MVP (< 100 users, < $1k MRR)

```
- Frontend: Vercel (free tier)
- Backend: Railway / Fly.io ($20-50/mo)
- Database: Supabase free tier
- Cache: Upstash free tier (10k req/day)
- Storage: Cloudflare R2 ($0.015/GB/mo)
- Email: SendGrid free tier (100 emails/day)
- Auth: Clerk free tier (5k users)
- Monitoring: Sentry (free)
- CI/CD: GitHub Actions (free)
Total: ~$30-80/mo
```

#### Phase 2 — Growth (< 1000 users, < $10k MRR)

```
- Frontend: Vercel Pro ($20/mo)
- Backend: Railway scale (2-4 services, $100-200/mo)
- Database: Supabase Pro ($25/mo)
- Cache: Upstash paid ($10-50/mo)
- Storage: Cloudflare R2 ($10-50/mo)
- Email: SendGrid Essentials ($20/mo, 50k emails)
- Auth: Clerk Pro ($25/mo)
- OCR/AI: OpenAI API ($50-200/mo)
- Monitoring: Grafana Cloud ($30/mo)
Total: ~$300-600/mo
```

#### Phase 3 — Scale (> 1000 users, > $10k MRR)

```
- Frontend: Vercel Enterprise
- Backend: AWS ECS / DigitalOcean K8s ($500-2000/mo)
- Database: Neon Scale / AWS RDS ($100-500/mo)
- Cache: Upstash Enterprise / Redis Enterprise
- All services: Production-grade with SLA
- Dedicated Temporal Cloud for orchestration ($200/mo)
Total: $1500-5000/mo
```

## 4. Monorepo Structure

```
domine/
├── packages/
│   ├── backend/                    # NestJS backend (monolith first, extract later)
│   │   ├── src/
│   │   │   ├── auth/              # Auth module
│   │   │   ├── users/             # User module
│   │   │   ├── products/          # Product module
│   │   │   ├── content/           # Content pipeline module
│   │   │   ├── marketplaces/      # Marketplace connector module
│   │   │   ├── marketing/         # Marketing engine module
│   │   │   ├── analytics/         # Analytics module
│   │   │   ├── billing/           # Billing module
│   │   │   ├── scheduler/         # Scheduler module
│   │   │   └── common/            # Shared utilities, guards, interceptors
│   │   ├── workers/               # Background workers (NestJS microservices)
│   │   │   ├── content-worker/    # Content processing worker
│   │   │   ├── email-worker/      # Email sending worker
│   │   │   ├── social-worker/     # Social publishing worker
│   │   │   └── analytics-worker/  # Event processing worker
│   │   └── proto/                 # gRPC proto definitions
│   ├── frontend/                  # React + Vite dashboard
│   ├── landing/                   # Marketing landing page (Next.js)
│   ├── shared/                    # Shared TypeScript types, validation schemas
│   └── docs/                      # Architecture documentation
├── docker/
├── k8s/
├── .github/
│   └── workflows/
├── turbo.json                     # Turborepo configuration
└── package.json
```

## 5. Key Dependencies

### Backend (NestJS)

```
@nestjs/core, @nestjs/common, @nestjs/platform-express
@nestjs/graphql (optional, if GraphQL needed)
@nestjs/bull (Bull queue management)
@nestjs/throttler (rate limiting)
@nestjs/swagger (OpenAPI generation)
@nestjs/microservices (for microservice workers)
@prisma/client (ORM)
prisma (schema management + migrations)
ioredis (Redis client)
amqplib (RabbitMQ client)
sharp (image processing)
pandoc-filter (document conversion bridge)
openai (AI/LLM client)
stripe (billing)
@sendgrid/mail (email)
zod (validation)
```

### Frontend (React)

```
react, react-dom, react-router-dom
@tanstack/react-query (data fetching)
@tanstack/react-table (tables)
zod + react-hook-form (forms)
@radix-ui/* (accessible UI primitives)
tailwindcss, postcss, autoprefixer
lucide-react (icons)
recharts (charts)
@stripe/react-stripe-js (billing UI)
```

## 6. Alternative Stacks Considered

### Python + FastAPI + Celery
- **Pros**: Best AI/ML ecosystem, Celery is mature for async tasks, FastAPI auto-generates OpenAPI
- **Cons**: No unified language with frontend, slower for I/O-heavy workloads, fewer real-time features
- **Verdict**: Better if AI/ML pipeline is the core differentiator vs. marketplace integrations

### Go + gRPC
- **Pros**: Excellent performance, low memory, great for microservices
- **Cons**: Slower iteration, fewer libraries for content pipeline, steeper learning curve
- **Verdict**: Better for later-stage re-architecture of high-throughput components

### Django + DRF + Celery
- **Pros**: Batteries-included, great admin panel, mature ORM
- **Cons**: Heavy framework, Python concurrency limits, less ideal for real-time features
- **Verdict**: Solid alternative if the team is Python-heavy

### Ruby on Rails + Sidekiq
- **Pros**: Fastest prototyping, mature async jobs, excellent gem ecosystem
- **Cons**: Performance ceiling, scaling costs, talent pool shrinking
- **Verdict**: Excellent for rapid prototyping; consider for MVP then re-architect

**Recommended**: Start with NestJS + TypeScript monorepo. The unified language between frontend and backend, strong typing, and NestJS's modular architecture make it the best fit for a team that values both speed and structure.