# Database Schema

## 1. Design Principles

- **Per-service schemas** in a shared PostgreSQL cluster (logical isolation, not physical)
- **UUID primary keys** everywhere for distributed compatibility
- **Created/updated timestamps** on every table
- **Soft deletes** where applicable (`deleted_at` column)
- **JSONB for flexible metadata** (marketplace-specific fields, product attributes)
- **Immutable event log** separate from mutable entity tables
- **Index strategy**: B-tree for PK/FK/lookup columns, GIN for JSONB queries, GiST for full-text search

## 2. Schema Overview

```
┌──────────────────────┐     ┌────────────────────────┐     ┌──────────────────────┐
│       auth            │     │       users             │     │      products         │
│  ┌────────────────┐   │     │  ┌─────────────────┐    │     │  ┌────────────────┐  │
│  │ users          │   │     │  │ organizations   │    │     │  │ products       │  │
│  │ oauth_accounts │   │     │  │ org_members     │    │     │  │ product_ver    │  │
│  │ refresh_tokens │───┼─────┼─▶│ teams           │    │     │  │ product_files  │  │
│  │ api_keys       │   │     │  │ subscriptions   │    │     │  │ categories     │  │
│  └────────────────┘   │     │  │ invoices        │    │     │  │ product_tags   │  │
└──────────────────────┘     │  │ user_settings   │    │     │  │ bundles        │  │
                             │  └─────────────────┘    │     │  │ bundle_items   │  │
                             └────────────────────────┘     │  │ reviews        │  │
                                                             │  └────────────────┘  │
┌──────────────────────┐     ┌────────────────────────┐     └──────────────────────┘
│       content         │     │      marketplace       │
│  ┌────────────────┐   │     │  ┌─────────────────┐   │     ┌──────────────────────┐
│  │ source_assets  │   │     │  │ marketplaces    │   │     │      marketing        │
│  │ processed_docs │   │     │  │ listings        │   │     │  ┌────────────────┐  │
│  │ templates      │───┼─────┼─▶│ listing_orders  │   │     │  │ landing_pages  │  │
│  │ enrichment_jobs│   │     │  │ listing_sync_log│   │     │  │ leads          │  │
│  │ asset_versions │   │     │  │ connector_cfg   │   │     │  │ segments       │  │
│  └────────────────┘   │     │  └─────────────────┘   │     │  │ segment_rules  │  │
└──────────────────────┘     └────────────────────────┘     │  │ campaigns      │  │
                                                             │  │ campaign_steps │  │
┌──────────────────────┐     ┌────────────────────────┐     │  │ email_templates│  │
│      analytics        │     │       billing           │     │  │ social_posts   │  │
│  ┌────────────────┐   │     │  ┌─────────────────┐   │     │  │ purchase_remdr │  │
│  │ events         │   │     │  │ subscriptions   │   │     │  │ lead_magnet_req│  │
│  │ event_log      │   │     │  │ usage_records   │   │     │  └────────────────┘  │
│  │ conversions    │───┼─────┼─▶│ invoices        │   │     └──────────────────────┘
│  │ kpi_snapshots  │   │     │  │ payment_methods │   │
│  │ dashboards     │   │     │  └─────────────────┘   │
│  └────────────────┘   │     └────────────────────────┘
└──────────────────────┘
```

## 3. Detailed Table Definitions

### 3.1 Auth Schema

```sql
-- Schema: auth
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE auth.users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    email_verified  BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth.oauth_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL, -- 'google', 'github', 'apple'
    provider_id     VARCHAR(255) NOT NULL,
    provider_email  VARCHAR(255),
    access_token    TEXT,
    refresh_token   TEXT,
    token_expires   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

CREATE TABLE auth.refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth.api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID, -- nullable for personal keys
    key_prefix      VARCHAR(20) NOT NULL, -- first chars of key for identification
    key_hash        VARCHAR(255) NOT NULL, -- bcrypt hash of full key
    name            VARCHAR(100) NOT NULL,
    scopes          JSONB NOT NULL DEFAULT '[]', -- ["products:read", "products:write", ...]
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_users_email ON auth.users(email);
CREATE INDEX idx_auth_oauth_provider ON auth.oauth_accounts(provider, provider_id);
CREATE INDEX idx_auth_refresh_tokens_hash ON auth.refresh_tokens(token_hash);
```

### 3.2 User / Organization Schema

```sql
-- Schema: users
CREATE TABLE users.organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    owner_id        UUID NOT NULL REFERENCES auth.users(id),
    plan_tier       VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
    is_active       BOOLEAN DEFAULT TRUE,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users.org_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE users.user_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name    VARCHAR(255),
    avatar_url      TEXT,
    timezone        VARCHAR(50) DEFAULT 'UTC',
    locale          VARCHAR(10) DEFAULT 'en-US',
    notification_prefs JSONB DEFAULT '{"email": true, "browser": true}',
    theme           VARCHAR(20) DEFAULT 'light',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org_members_user ON users.org_members(user_id);
CREATE INDEX idx_users_org_members_org ON users.org_members(organization_id);
```

### 3.3 Product Schema

```sql
-- Schema: products
CREATE TABLE products.products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(500) NOT NULL,
    description     TEXT,
    product_type    VARCHAR(50) NOT NULL, -- 'ebook', 'print', 'art_print', 'audio', 'bundle'
    status          VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft','review','published','archived'
    source_asset_id UUID, -- FK to content.source_assets
    cover_image_url TEXT,
    price_cents     INTEGER,
    currency        VARCHAR(3) DEFAULT 'USD',
    metadata        JSONB DEFAULT '{}',
    is_public_domain BOOLEAN DEFAULT TRUE,
    original_author VARCHAR(500),
    original_year   INTEGER,
    tags            TEXT[],
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE products.product_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    changes_summary TEXT,
    file_manifest   JSONB, -- list of files in this version
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, version_number)
);

CREATE TABLE products.product_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
    version_id      UUID REFERENCES products.product_versions(id),
    file_type       VARCHAR(50) NOT NULL, -- 'pdf', 'epub', 'mobi', 'mp3', 'png', 'jpg'
    file_url        TEXT NOT NULL,
    file_size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    is_preview      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Category taxonomy
CREATE TABLE products.categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    parent_id       UUID REFERENCES products.categories(id),
    description     TEXT,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products.product_categories (
    product_id      UUID NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES products.categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE TABLE products.bundles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    bundle_type     VARCHAR(50) NOT NULL, -- 'fixed', 'pick_x', 'subscription'
    price_cents     INTEGER,
    discount_cents  INTEGER,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products.bundle_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_id       UUID NOT NULL REFERENCES products.bundles(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bundle_id, product_id)
);

CREATE INDEX idx_products_org ON products.products(organization_id);
CREATE INDEX idx_products_status ON products.products(status);
CREATE INDEX idx_products_type ON products.products(product_type);
CREATE INDEX idx_products_tags ON products.products USING GIN(tags);
CREATE INDEX idx_products_slug ON products.products(organization_id, slug);
CREATE INDEX idx_categories_slug ON products.categories(slug);
CREATE INDEX idx_categories_parent ON products.categories(parent_id);
```

### 3.4 Content Pipeline Schema

```sql
-- Schema: content
CREATE TABLE content.source_assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    source          VARCHAR(100) NOT NULL, -- 'gutenberg', 'wikimedia', 'archive_org', 'loc', 'musopen'
    source_id       VARCHAR(255) NOT NULL, -- ID in the source system
    title           VARCHAR(500),
    author          VARCHAR(500),
    description     TEXT,
    original_url    TEXT,
    content_type    VARCHAR(50) NOT NULL, -- 'book', 'image', 'music', 'document'
    license_info    VARCHAR(255) DEFAULT 'Public Domain',
    raw_metadata    JSONB,
    discovered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(50) DEFAULT 'discovered', -- 'discovered','downloaded','processing','ready','failed'
    error_message   TEXT,
    UNIQUE(organization_id, source, source_id)
);

CREATE TABLE content.processed_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_asset_id UUID NOT NULL REFERENCES content.source_assets(id) ON DELETE CASCADE,
    format          VARCHAR(50) NOT NULL, -- 'epub', 'pdf', 'mp3', 'png', 'markdown'
    file_url        TEXT NOT NULL,
    file_size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    processing_time_ms INTEGER,
    quality_score   REAL, -- automated quality assessment 0-1
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content.templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    name            VARCHAR(255) NOT NULL,
    template_type   VARCHAR(50) NOT NULL, -- 'cover', 'page_layout', 'email', 'landing_page'
    format          VARCHAR(20), -- 'html', 'css', 'svg', 'tex'
    content         TEXT NOT NULL, -- template content with variable placeholders
    preview_url     TEXT,
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content.enrichment_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_asset_id UUID NOT NULL REFERENCES content.source_assets(id),
    job_type        VARCHAR(100) NOT NULL, -- 'ocr', 'transcription', 'translation', 'summary', 'cover_gen'
    status          VARCHAR(50) DEFAULT 'pending', -- 'pending','running','completed','failed'
    config          JSONB,
    result          JSONB,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_source_asset_status ON content.source_assets(status);
CREATE INDEX idx_content_source_type ON content.source_assets(source, content_type);
CREATE INDEX idx_content_enrichment_status ON content.enrichment_jobs(status);
```

### 3.5 Marketplace Schema

```sql
-- Schema: marketplace
CREATE TABLE marketplace.marketplaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50) UNIQUE NOT NULL, -- 'amazon_kdp', 'etsy', 'shopify', 'gumroad'
    is_active       BOOLEAN DEFAULT TRUE,
    config_schema   JSONB, -- JSON Schema for required config fields
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace.connector_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    marketplace_id  UUID NOT NULL REFERENCES marketplace.marketplaces(id),
    is_enabled      BOOLEAN DEFAULT FALSE,
    credentials     JSONB NOT NULL, -- encrypted credentials per connector
    settings        JSONB DEFAULT '{}', -- marketplace-specific settings
    last_sync_at    TIMESTAMPTZ,
    last_sync_status VARCHAR(50), -- 'success', 'error', 'partial'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, marketplace_id)
);

CREATE TABLE marketplace.listings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products.products(id),
    marketplace_id  UUID NOT NULL REFERENCES marketplace.marketplaces(id),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    connector_cfg_id UUID NOT NULL REFERENCES marketplace.connector_configs(id),
    external_id     VARCHAR(255), -- ID on the marketplace
    listing_url     TEXT,
    title           VARCHAR(500),
    description     TEXT,
    price_cents     INTEGER,
    currency        VARCHAR(3),
    status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending','syncing','active','rejected','paused','ended'
    sync_status     VARCHAR(50), -- 'pending','in_progress','success','failed'
    sync_error      TEXT,
    -- Marketplace-specific metadata stored as JSONB
    marketplace_data JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, marketplace_id)
);

CREATE TABLE marketplace.listing_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID NOT NULL REFERENCES marketplace.listings(id),
    external_order_id VARCHAR(255),
    marketplace_order_id VARCHAR(255),
    buyer_email     VARCHAR(255),
    buyer_name      VARCHAR(255),
    order_status    VARCHAR(50) NOT NULL, -- 'pending','confirmed','shipped','delivered','refunded','cancelled'
    quantity        INTEGER DEFAULT 1,
    amount_cents    INTEGER,
    currency        VARCHAR(3),
    fee_cents       INTEGER,
    net_cents       INTEGER,
    ordered_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace.listing_sync_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id      UUID NOT NULL REFERENCES marketplace.listings(id),
    sync_type       VARCHAR(50) NOT NULL, -- 'push', 'pull', 'status_check'
    status          VARCHAR(50) NOT NULL, -- 'success', 'failed'
    request_data    JSONB,
    response_data   JSONB,
    error_message   TEXT,
    duration_ms     INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_org ON marketplace.listings(organization_id);
CREATE INDEX idx_listings_product ON marketplace.listings(product_id);
CREATE INDEX idx_listings_status ON marketplace.listings(status);
CREATE INDEX idx_listings_external ON marketplace.listings(external_id);
CREATE INDEX idx_orders_listing ON marketplace.listing_orders(listing_id);
```

### 3.6 Marketing Schema

```sql
-- Schema: marketing
CREATE TABLE marketing.landing_pages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    product_id      UUID REFERENCES products.products(id),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    meta_title      VARCHAR(255),
    meta_description TEXT,
    content         JSONB NOT NULL, -- structured sections (hero, features, CTA, etc.)
    template_id     UUID REFERENCES content.templates(id),
    published_url   TEXT,
    is_published    BOOLEAN DEFAULT FALSE,
    seo_score       REAL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE TABLE marketing.leads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    email           VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    source          VARCHAR(100), -- 'landing_page', 'social', 'referral', 'email_campaign', 'organic'
    source_url      TEXT, -- where they came from
    landing_page_id UUID REFERENCES marketing.landing_pages(id),
    utm_source      VARCHAR(255),
    utm_medium      VARCHAR(255),
    utm_campaign    VARCHAR(255),
    ip_address      INET,
    user_agent      TEXT,
    -- Consent tracking
    gdpr_consent    BOOLEAN DEFAULT FALSE,
    consent_granted_at TIMESTAMPTZ,
    -- Engagement metrics
    email_opens     INTEGER DEFAULT 0,
    email_clicks    INTEGER DEFAULT 0,
    page_views      INTEGER DEFAULT 0,
    -- Status
    status          VARCHAR(50) DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced', 'converted'
    converted_at    TIMESTAMPTZ,
    -- Scoring
    lead_score      REAL DEFAULT 0, -- 0-100
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

CREATE TABLE marketing.segments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    segment_type    VARCHAR(50) NOT NULL DEFAULT 'dynamic', -- 'static', 'dynamic'
    match_logic     VARCHAR(10) DEFAULT 'and', -- 'and' or 'or' across rules
    lead_count      INTEGER DEFAULT 0, -- cached count
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketing.segment_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id      UUID NOT NULL REFERENCES marketing.segments(id) ON DELETE CASCADE,
    field           VARCHAR(100) NOT NULL, -- 'lead_score', 'source', 'email_opens', 'status', 'created_at'
    operator        VARCHAR(20) NOT NULL, -- 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in'
    value           JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketing.campaigns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    product_id      UUID REFERENCES products.products(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    campaign_type   VARCHAR(50) NOT NULL, -- 'email_drip', 'social', 'retargeting', 'abandoned_cart'
    status          VARCHAR(50) DEFAULT 'draft', -- 'draft','active','paused','completed','archived'
    segment_ids     UUID[], -- target segments
    start_at        TIMESTAMPTZ,
    end_at          TIMESTAMPTZ,
    -- Performance stats (cached)
    sent_count      INTEGER DEFAULT 0,
    open_count      INTEGER DEFAULT 0,
    click_count     INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    revenue_cents   INTEGER DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketing.campaign_steps (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id     UUID NOT NULL REFERENCES marketing.campaigns(id) ON DELETE CASCADE,
    step_order      INTEGER NOT NULL,
    step_type       VARCHAR(50) NOT NULL, -- 'email', 'social_post', 'wait', 'condition', 'webhook'
    delay_hours     INTEGER DEFAULT 0, -- hours after previous step
    -- For email steps
    email_template_id UUID,
    email_subject   VARCHAR(500),
    email_body      TEXT,
    -- For social steps
    social_platform VARCHAR(50), -- 'twitter', 'facebook', 'instagram', 'linkedin', 'pinterest'
    social_content  TEXT,
    social_media_urls JSONB,
    -- For condition steps
    condition_field VARCHAR(100),
    condition_operator VARCHAR(20),
    condition_value JSONB,
    -- For webhook steps
    webhook_url     TEXT,
    webhook_payload JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, step_order)
);

CREATE TABLE marketing.email_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    name            VARCHAR(255) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    preview_text    VARCHAR(255),
    body_html       TEXT NOT NULL,
    body_text       TEXT,
    from_name       VARCHAR(255),
    from_email      VARCHAR(255),
    reply_to        VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketing.social_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    campaign_step_id UUID REFERENCES marketing.campaign_steps(id),
    product_id      UUID REFERENCES products.products(id),
    platform        VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    media_urls      TEXT[],
    scheduled_at    TIMESTAMPTZ,
    posted_at       TIMESTAMPTZ,
    post_url        TEXT,
    status          VARCHAR(50) DEFAULT 'draft', -- 'draft','scheduled','posted','failed'
    engagement_data JSONB, -- likes, shares, comments
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketing.purchase_reminders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    lead_id         UUID NOT NULL REFERENCES marketing.leads(id),
    product_id      UUID REFERENCES products.products(id),
    reminder_type   VARCHAR(50) NOT NULL, -- 'abandoned_browse', 'abandoned_cart', 'price_drop', 'reengagement'
    trigger_event   VARCHAR(100), -- event that triggered this reminder
    step_number     INTEGER DEFAULT 1, -- 1st, 2nd, 3rd reminder in sequence
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    channel         VARCHAR(50), -- 'email', 'push', 'sms'
    content         TEXT,
    clicked_at      TIMESTAMPTZ,
    converted_at    TIMESTAMPTZ,
    status          VARCHAR(50) DEFAULT 'pending', -- 'pending','sent','clicked','converted','expired'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON marketing.leads(organization_id);
CREATE INDEX idx_leads_status ON marketing.leads(status);
CREATE INDEX idx_leads_score ON marketing.leads(lead_score);
CREATE INDEX idx_leads_email ON marketing.leads(organization_id, email);
CREATE INDEX idx_segments_org ON marketing.segments(organization_id);
CREATE INDEX idx_campaigns_org ON marketing.campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON marketing.campaigns(status);
CREATE INDEX idx_reminders_lead ON marketing.purchase_reminders(lead_id);
CREATE INDEX idx_reminders_status ON marketing.purchase_reminders(status);
```

### 3.7 Analytics Schema

```sql
-- Schema: analytics
CREATE TABLE analytics.events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    event_type      VARCHAR(100) NOT NULL, -- 'page_view', 'lead_captured', 'purchase', 'email_opened', etc.
    event_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Common dimensions
    product_id      UUID,
    lead_id         UUID,
    campaign_id     UUID,
    listing_id      UUID,
    -- Actor
    anonymous_id    VARCHAR(255), -- cookie/fingerprint ID for unauthenticated users
    user_id         UUID,
    -- Source attribution
    source          VARCHAR(100),
    utm_source      VARCHAR(255),
    utm_medium      VARCHAR(255),
    utm_campaign    VARCHAR(255),
    -- Payload
    properties      JSONB NOT NULL DEFAULT '{}',
    -- Session
    session_id      VARCHAR(255),
    ip_address      INET,
    user_agent      TEXT
) PARTITION BY RANGE (event_time);

CREATE TABLE analytics.conversions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    product_id      UUID NOT NULL,
    lead_id         UUID,
    listing_id      UUID,
    marketplace_id  UUID,
    conversion_type VARCHAR(50) NOT NULL, -- 'sale', 'lead', 'signup', 'download'
    amount_cents    INTEGER,
    currency        VARCHAR(3),
    -- Attribution (first/last touch)
    first_touch_source VARCHAR(100),
    first_touch_campaign VARCHAR(255),
    last_touch_source VARCHAR(100),
    last_touch_campaign VARCHAR(255),
    touch_points    JSONB, -- array of attribution touch events
    converted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analytics.kpi_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    snapshot_date   DATE NOT NULL,
    -- Core KPIs
    active_products INTEGER DEFAULT 0,
    total_listings  INTEGER DEFAULT 0,
    total_leads     INTEGER DEFAULT 0,
    new_leads       INTEGER DEFAULT 0,
    total_orders    INTEGER DEFAULT 0,
    revenue_cents   INTEGER DEFAULT 0,
    refund_cents    INTEGER DEFAULT 0,
    net_revenue_cents INTEGER DEFAULT 0,
    email_sent      INTEGER DEFAULT 0,
    email_open_rate REAL,
    email_click_rate REAL,
    conversion_rate REAL,
    lead_to_purchase_days REAL, -- avg days from lead capture to purchase
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, snapshot_date)
);

CREATE INDEX idx_events_org_time ON analytics.events(organization_id, event_time);
CREATE INDEX idx_events_type ON analytics.events(event_type);
CREATE INDEX idx_conversions_org ON analytics.conversions(organization_id);
CREATE INDEX idx_conversions_product ON analytics.conversions(product_id);
CREATE INDEX idx_kpi_org_date ON analytics.kpi_snapshots(organization_id, snapshot_date);
```

### 3.8 Billing Schema

```sql
-- Schema: billing
CREATE TABLE billing.subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID UNIQUE NOT NULL REFERENCES users.organizations(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id  VARCHAR(255),
    plan_tier           VARCHAR(50) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active','past_due','canceled','trialing'
    current_period_start TIMESTAMPTZ,
    current_period_end  TIMESTAMPTZ,
    trial_end           TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    -- Product limits
    max_products        INTEGER,
    max_marketplaces    INTEGER,
    feature_flags       JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing.usage_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    subscription_id UUID REFERENCES billing.subscriptions(id),
    metric          VARCHAR(100) NOT NULL, -- 'products_published', 'orders_processed', 'emails_sent', 'api_calls'
    quantity        INTEGER NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- For Stripe metered billing
    stripe_usage_record_id VARCHAR(255)
);

CREATE TABLE billing.invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES users.organizations(id),
    stripe_invoice_id VARCHAR(255) UNIQUE,
    subscription_id UUID REFERENCES billing.subscriptions(id),
    amount_due_cents INTEGER NOT NULL,
    amount_paid_cents INTEGER,
    currency        VARCHAR(3) DEFAULT 'USD',
    status          VARCHAR(50) NOT NULL, -- 'draft','open','paid','void','uncollectible'
    invoice_pdf_url TEXT,
    period_start    TIMESTAMPTZ,
    period_end      TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_org ON billing.subscriptions(organization_id);
CREATE INDEX idx_billing_usage_org ON billing.usage_records(organization_id, recorded_at);
```

### 3.9 Scheduler Schema

```sql
-- Schema: scheduler
CREATE TABLE scheduler.jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES users.organizations(id), -- NULL for system jobs
    name            VARCHAR(255) NOT NULL,
    job_type        VARCHAR(100) NOT NULL, -- 'content_discovery', 'marketplace_sync', 'campaign_execute', etc.
    cron_expression VARCHAR(100),
    workflow_dag    JSONB, -- DAG definition for multi-step workflows
    config          JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    max_retries     INTEGER DEFAULT 3,
    timeout_minutes INTEGER DEFAULT 30,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scheduler.job_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id          UUID NOT NULL REFERENCES scheduler.jobs(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending','running','completed','failed','timed_out'
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    result          JSONB,
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduler_jobs_active ON scheduler.jobs(is_active);
CREATE INDEX idx_scheduler_exec_status ON scheduler.job_executions(status);
CREATE INDEX idx_scheduler_exec_job ON scheduler.job_executions(job_id);
```

## 4. Full-Text Search

```sql
-- Full-text search for products
ALTER TABLE products.products ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
    ) STORED;

CREATE INDEX idx_products_search ON products.products USING GIN(search_vector);
```

## 5. Migration Strategy

- Use **golang-migrate** or **Flyway** for schema migrations
- Each service manages its own schema in separate migration directories
- Migration naming convention: `YYYYMMDD_HHMMSS_description.up.sql` and `.down.sql`
- Backward-compatible migrations only (no destructive changes without deprecation window)
- Schema version tracked in a `schema_migrations` table per schema