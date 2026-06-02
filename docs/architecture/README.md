# Domine — System Architecture

**Project**: Domine — domine.io  
**Etymology**: "Mining" public domains (domain → domine)

## Overview

Domine is a fully automated SaaS platform that discovers public-domain content, repackages it into sellable digital/physical products, connects to major marketplaces, and runs the entire marketing & sales funnel.

This directory contains the complete architecture documentation:

| Document | Description |
|---|---|
| `01-system-overview.md` | High-level architecture, service decomposition, data flow |
| `02-database-schema.md` | Complete relational schema with entity relationships |
| `03-api-design.md` | REST API, webhooks, marketplace connector interfaces |
| `04-marketing-engine.md` | Lead capture, segmentation, nurturing, conversion design |
| `05-content-pipeline.md` | Public domain discovery, processing, repackaging pipeline |
| `06-tech-stack.md` | Technology recommendations with cost/scalability analysis |
| `07-deployment-strategy.md` | Infrastructure, CI/CD, scaling, and operations |

## Architecture Principles

1. **Event-driven core** — asynchronous processing via message queues between services
2. **Single Responsibility** — each microservice owns one domain
3. **API-first** — every capability exposed via REST/gRPC, enabling headless operation
4. **Pluggable marketplaces** — adapter pattern for marketplace integrations
5. **Stateless where possible** — horizontal scaling without sticky sessions
6. **Audit everything** — immutable event log for compliance and debugging

## System at a Glance

```
                     ┌─────────────────────────────────────┐
                     │          User Dashboard (Web)        │
                     │   React SPA / Mobile / API Clients   │
                     └────────────────┬────────────────────┘
                                      │ HTTPS / WSS
                                      ▼
                     ┌─────────────────────────────────────┐
                     │        API Gateway (Kong/Traefik)    │
                     │     Auth, Rate Limit, Routing, Log   │
                     └──────┬──────┬──────┬──────┬─────────┘
                            │      │      │      │
               ┌────────────┘      │      │      └────────────┐
               ▼                    ▼      ▼                    ▼
        ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐
        │ Auth Service │   │ User Service │   │  Product Service     │
        │ (JWT/OAuth)  │   │(Profiles,    │   │ (CRUD, Versions,     │
        │              │   │ Teams, Billing)│  │ Bundles, Metadata)   │
        └─────────────┘   └──────────────┘   └──────────────────────┘
                                                      │
        ┌─────────────┐   ┌──────────────┐   ┌───────┴──────────────┐
        │ Market Conn  │   │  Content     │   │  Marketing Engine    │
        │(Amazon,Etsy, │   │  Pipeline    │   │(Segments, Campaigns, │
        │Shopify, etc) │   │(Discovery,   │   │ Emails, Social, Ret.)│
        │              │   │ Processing)  │   │                      │
        └─────────────┘   └──────────────┘   └──────────────────────┘

        ┌────────────────────────────────────────────────────────────┐
        │                    Message Queue (Redis/RabbitMQ)          │
        └────────────────────────────────────────────────────────────┘

        ┌────────────────────────────────────────────────────────────┐
        │                    Data Layer                              │
        │  PostgreSQL (Primary) + Redis (Cache/Queue) + S3 (Media)  │
        └────────────────────────────────────────────────────────────┘
```

## Key Subsystems

1. **Content Pipeline** — discovers & processes public-domain assets (Project Gutenberg, Wikimedia Commons, Internet Archive, Library of Congress, Musopen)
2. **Product Service** — manages product lifecycle (draft → review → published → archived)
3. **Marketplace Connectors** — adapter-based integrations with Amazon KDP, Etsy, Shopify, Gumroad, etc.
4. **Marketing Engine** — lead capture, audience segmentation, email sequences, social media scheduling, backlink generation, purchase reminders
5. **User & Auth Service** — accounts, teams, billing, RBAC
6. **Analytics Service** — KPIs, conversion tracking, revenue attribution, dashboards
7. **Scheduler/Orchestrator** — cron-like job scheduling for content discovery, marketplace sync, campaign execution

## Data Flow (End-to-End)

```
User signs up → Creates first "product definition" (niche, format, marketplace)
  → Content Pipeline discovers assets matching niche
  → Pipeline processes & repackages into sellable format (PDF, EPUB, Print-ready, Art print)
  → Product Service creates product record → sends to Marketplace Connector
  → Connector publishes to selected marketplaces
  → Marketing Engine creates lead capture page + email sequences + social content
  → Visitor lands → lead captured → segmented → nurtured → purchase reminder → sale
  → Analytics records conversion → User sees dashboard
```

## Future Considerations

- Multi-tenant isolation (schema-per-tenant vs row-level security)
- White-labeling for agencies
- AI-assisted content enhancement (summary generation, cover design via DALL·E/Stable Diffusion)
- API marketplace for third-party extensions