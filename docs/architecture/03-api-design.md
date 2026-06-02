# API Design

## 1. Design Principles

- **RESTful** for CRUD operations; **gRPC** for internal high-throughput inter-service communication
- **OpenAPI 3.1** specification for all public endpoints
- **Versioned** via URL prefix (`/api/v1/`)
- **Consistent response envelope**: all responses wrapped in `{ data, meta, errors }`
- **Pagination**: cursor-based for list endpoints; page-based as fallback
- **Idempotency**: write endpoints support `Idempotency-Key` header
- **Rate limiting**: returned in `X-RateLimit-*` headers

## 2. API Response Envelope

```json
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-05-26T12:00:00Z",
    "pagination": {
      "cursor": "eyJpZCI6IjEyMyJ9",
      "has_more": true
    }
  },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 3. Authentication

All endpoints except `POST /auth/*` require one of:

```
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
```

## 4. Core API Endpoints

### 4.1 Auth Service (`/api/v1/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account (email + password) |
| POST | `/auth/login` | Login, returns JWT + refresh token |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/oauth/{provider}` | Initiate OAuth flow |
| POST | `/auth/oauth/{provider}/callback` | OAuth callback |

### 4.2 User Service (`/api/v1/users`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update profile |
| GET | `/users/me/settings` | Get settings |
| PATCH | `/users/me/settings` | Update settings |
| GET | `/organizations` | List orgs for user |
| POST | `/organizations` | Create organization |
| GET | `/organizations/{id}` | Get org details |
| PATCH | `/organizations/{id}` | Update org |
| GET | `/organizations/{id}/members` | List members |
| POST | `/organizations/{id}/members` | Invite member |
| PATCH | `/organizations/{id}/members/{userId}` | Update member role |
| DELETE | `/organizations/{id}/members/{userId}` | Remove member |

### 4.3 Product Service (`/api/v1/products`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List products (filterable, paginated) |
| POST | `/products` | Create product |
| GET | `/products/{id}` | Get product details |
| PATCH | `/products/{id}` | Update product |
| DELETE | `/products/{id}` | Soft-delete product |
| POST | `/products/{id}/publish` | Publish product (triggers marketplace sync) |
| POST | `/products/{id}/archive` | Archive product |
| POST | `/products/{id}/duplicate` | Duplicate product |
| GET | `/products/{id}/versions` | List versions |
| GET | `/products/{id}/files` | List files |
| POST | `/products/{id}/files` | Upload file |
| GET | `/categories` | List categories (tree) |
| GET | `/bundles` | List bundles |
| POST | `/bundles` | Create bundle |

**Query parameters for `GET /products`:**

- `status` — filter by status (`draft`, `review`, `published`, `archived`)
- `type` — filter by product type
- `category` — filter by category slug
- `tag` — filter by tag
- `q` — full-text search
- `cursor` — pagination cursor
- `limit` — page size (default 20, max 100)
- `sort` — sort field (`created_at`, `title`, `price`; default `-created_at`)

**Product creation request:**

```json
{
  "title": "The Art of War - Illustrated Edition",
  "description": "Sun Tzu's classic military treatise...",
  "product_type": "ebook",
  "source_asset_id": "uuid",
  "original_author": "Sun Tzu",
  "original_year": -500,
  "price_cents": 499,
  "currency": "USD",
  "tags": ["philosophy", "warfare", "ancient"],
  "category_ids": ["uuid1", "uuid2"],
  "metadata": {
    "isbn": "978-...",
    "page_count": 120,
    "language": "en"
  }
}
```

### 4.4 Content Pipeline (`/api/v1/content`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/content/sources` | List configured content sources |
| POST | `/content/discover` | Trigger discovery job |
| GET | `/content/assets` | List discovered assets |
| GET | `/content/assets/{id}` | Get asset details |
| POST | `/content/assets/{id}/process` | Trigger processing |
| GET | `/content/assets/{id}/processed` | List processed formats |
| GET | `/content/templates` | List templates |
| POST | `/content/templates` | Create template |
| GET | `/content/templates/{id}` | Get template |
| PATCH | `/content/templates/{id}` | Update template |
| GET | `/content/jobs` | List enrichment/processing jobs |
| GET | `/content/jobs/{id}` | Get job status |

### 4.5 Marketplace Connector (`/api/v1/marketplaces`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/marketplaces` | List available marketplaces |
| POST | `/marketplaces/{code}/connect` | Start OAuth/API key connection flow |
| GET | `/marketplaces/connections` | List user's connections |
| PATCH | `/marketplaces/connections/{id}` | Update connection settings |
| DELETE | `/marketplaces/connections/{id}` | Disconnect marketplace |
| GET | `/marketplaces/listings` | List all listings |
| GET | `/marketplaces/listings/{id}` | Get listing details |
| POST | `/marketplaces/listings/{id}/sync` | Trigger manual sync |
| GET | `/marketplaces/listings/{id}/orders` | List orders for listing |
| GET | `/marketplaces/orders` | List all orders (filterable) |

### 4.6 Marketing Engine (`/api/v1/marketing`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/marketing/landing-pages` | List landing pages |
| POST | `/marketing/landing-pages` | Create landing page |
| GET | `/marketing/landing-pages/{id}` | Get landing page |
| PATCH | `/marketing/landing-pages/{id}` | Update landing page |
| POST | `/marketing/landing-pages/{id}/publish` | Publish landing page |
| GET | `/marketing/leads` | List leads (filterable) |
| GET | `/marketing/leads/{id}` | Get lead details |
| PATCH | `/marketing/leads/{id}` | Update lead |
| POST | `/marketing/leads/{id}/convert` | Mark lead as converted |
| GET | `/marketing/segments` | List segments |
| POST | `/marketing/segments` | Create segment |
| GET | `/marketing/segments/{id}` | Get segment details and members |
| PATCH | `/marketing/segments/{id}` | Update segment |
| DELETE | `/marketing/segments/{id}` | Delete segment |
| GET | `/marketing/campaigns` | List campaigns |
| POST | `/marketing/campaigns` | Create campaign |
| GET | `/marketing/campaigns/{id}` | Get campaign with steps |
| PATCH | `/marketing/campaigns/{id}` | Update campaign |
| POST | `/marketing/campaigns/{id}/activate` | Activate campaign |
| POST | `/marketing/campaigns/{id}/pause` | Pause campaign |
| POST | `/marketing/campaigns/{id}/steps` | Add campaign step |
| PATCH | `/marketing/campaigns/{id}/steps/{stepId}` | Update step |
| GET | `/marketing/email-templates` | List email templates |
| POST | `/marketing/email-templates` | Create email template |
| POST | `/marketing/email-templates/{id}/test` | Send test email |
| GET | `/marketing/social-posts` | List social posts |
| POST | `/marketing/social-posts` | Schedule a social post |
| PATCH | `/marketing/social-posts/{id}` | Update post |
| GET | `/marketing/purchase-reminders` | List reminders |
| POST | `/marketing/purchase-reminders/configure` | Configure reminder sequences |
| POST | `/marketing/analytics/report` | Generate marketing report |

### 4.7 Analytics (`/api/v1/analytics`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/dashboard` | Get main dashboard KPIs |
| GET | `/analytics/revenue` | Revenue breakdown (by product, marketplace, time) |
| GET | `/analytics/conversions` | Conversion funnel data |
| GET | `/analytics/products/{id}/performance` | Per-product analytics |
| GET | `/analytics/export` | Export data (CSV, JSON) |
| POST | `/analytics/track` | Server-side event tracking endpoint |

### 4.8 Billing (`/api/v1/billing`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/subscription` | Get current subscription |
| POST | `/billing/subscription/change` | Change plan tier |
| POST | `/billing/subscription/cancel` | Cancel subscription |
| GET | `/billing/invoices` | List invoices |
| GET | `/billing/invoices/{id}` | Get invoice details |
| GET | `/billing/payment-methods` | List payment methods |
| POST | `/billing/payment-methods` | Add payment method |
| DELETE | `/billing/payment-methods/{id}` | Remove payment method |
| GET | `/billing/usage` | Get current usage vs limits |

## 5. Webhook Endpoints

External marketplace webhooks that Domine exposes:

| Method | Path | Source | Purpose |
|--------|------|--------|---------|
| POST | `/webhooks/marketplace/{code}/order` | All marketplaces | New order notification |
| POST | `/webhooks/marketplace/{code}/refund` | All marketplaces | Refund processed |
| POST | `/webhooks/marketplace/{code}/listing-status` | Amazon, Etsy | Listing approved/rejected |
| POST | `/webhooks/marketplace/{code}/question` | Etsy | Buyer question |
| POST | `/webhooks/marketplace/{code}/review` | Amazon, Etsy | New review |

Domine also sends webhooks to user-configured URLs:

| Event | Payload | Use Case |
|-------|---------|----------|
| `product.published` | product_id, listing_urls | Notify user |
| `order.received` | order details | Fulfillment notification |
| `content.processing.complete` | asset_id, format | Alert user |
| `campaign.completed` | campaign_id, stats | Weekly summary |

## 6. Marketplace Connector Interface (Adapter Pattern)

Each marketplace integration implements this interface:

```typescript
interface MarketplaceConnector {
  // Identity
  readonly code: string;        // 'amazon_kdp', 'etsy', etc.
  readonly name: string;
  
  // Connection
  connect(config: ConnectorConfig): Promise<ConnectionResult>;
  disconnect(connectionId: string): Promise<void>;
  validate(config: ConnectorConfig): Promise<ValidationResult>;
  
  // Listing management
  createListing(product: Product, config: ConnectorConfig): Promise<ListingResult>;
  updateListing(listing: Listing, product: Product): Promise<ListingResult>;
  deleteListing(listing: Listing): Promise<void>;
  getListingStatus(listing: Listing): Promise<ListingStatus>;
  
  // Inventory & Orders
  syncInventory(listings: Listing[]): Promise<SyncResult>;
  fetchOrders(since: Date): Promise<Order[]>;
  
  // Webhook handling
  handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookResult>;
  
  // Metadata
  getRequiredConfigFields(): ConfigField[];
  getCapabilities(): ConnectorCapability[];
}
```

### Connector Capabilities

```typescript
interface ConnectorCapability {
  supportsMultipleFormats: boolean;
  supportsPricing: boolean;
  supportsInventory: boolean;
  supportsOrders: boolean;
  supportsReviews: boolean;
  maxListingsPerBatch: number;
  rateLimitPerHour: number;
  requiredApproval: boolean; // e.g., Amazon requires KDP approval
}
```

### Marketplace-Specific Details

| Marketplace | Connector | Auth Method | Key Features |
|---|---|---|---|
| Amazon KDP | `amazon_kdp` | Seller Central API (OAuth 2.0) | KDP Select enrollment, paperback/hardcover, Kindle eBook |
| Etsy | `etsy` | OAuth 2.0 + API Key | Digital downloads, physical prints, pattern listings |
| Shopify | `shopify` | REST Admin API (private app / OAuth) | Full product CRUD, inventory, orders |
| Gumroad | `gumroad` | API Key | Digital products, memberships, pay-what-you-want |
| eBay | `ebay` | eBay Commerce API (OAuth 2.0) | Fixed-price listings, auction, best offer |
| Creative Market | `creative_market` | API Key (partner program) | Fonts, templates, design assets |

## 7. API Rate Limiting

| Tier | Global Limit | Per-Endpoint Limit | Burst |
|------|-------------|-------------------|-------|
| Free | 100 req/hr | 10 req/min | 20 |
| Starter | 500 req/hr | 60 req/min | 100 |
| Pro | 2000 req/hr | 300 req/min | 500 |
| Enterprise | Custom | Custom | Custom |

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1622047200
Retry-After: 120
```

## 8. API Versioning & Deprecation

- Version in URL path: `/api/v1/`, `/api/v2/`
- Minor changes are backward-compatible within a major version
- Deprecation announced via `Sunset` header and `X-API-Deprecated` header
- Minimum 6-month deprecation window before removing an endpoint
- Deprecated endpoints continue to work but return a `Warning` header

## 9. Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email/password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT expired |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | Role lacks permission |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 422 | Request body validation failure |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate) |
| `MARKETPLACE_CONNECTION_ERROR` | 502 | Marketplace API failure |
| `CONTENT_PROCESSING_FAILED` | 500 | Content pipeline error |
| `PLAN_LIMIT_EXCEEDED` | 402 | Subscription tier limit reached |
| `IDEMPOTENCY_REPLAY` | 409 | Duplicate idempotent request |

## 10. Internal Service API (gRPC)

For internal inter-service communication, Domine uses gRPC with Protocol Buffers. Key services:

```protobuf
service ProductService {
  rpc GetProduct(GetProductRequest) returns (Product) {}
  rpc ListProducts(ListProductsRequest) returns (ListProductsResponse) {}
  rpc CreateProduct(CreateProductRequest) returns (Product) {}
  rpc UpdateProductStatus(UpdateProductStatusRequest) returns (Product) {}
}

service ContentPipelineService {
  rpc SubmitDiscoveryJob(DiscoveryRequest) returns (Job) {}
  rpc GetJobStatus(JobStatusRequest) returns (Job) {}
  rpc GetProcessedAsset(AssetRequest) returns (ProcessedAsset) {}
}

service MarketplaceConnectorService {
  rpc CreateListing(CreateListingRequest) returns (Listing) {}
  rpc SyncListings(SyncRequest) returns (SyncResponse) {}
  rpc ProcessMarketplaceWebhook(WebhookRequest) returns (WebhookResponse) {}
}

service MarketingEngineService {
  rpc CaptureLead(CaptureLeadRequest) returns (Lead) {}
  rpc EvaluateSegment(EvaluateSegmentRequest) returns (EvaluateSegmentResponse) {}
  rpc ExecuteCampaignStep(CampaignStepRequest) returns (CampaignStepResponse) {}
  rpc ScheduleReminder(ScheduleReminderRequest) returns (Reminder) {}
}

service AnalyticsService {
  rpc TrackEvent(TrackEventRequest) returns (Empty) {}
  rpc GetKPIs(KPIRequest) returns (KPIResponse) {}
}
```

## 11. Async Event Payloads (CloudEvents)

```json
{
  "specversion": "1.0",
  "type": "com.domine.product.published",
  "source": "/products/v1",
  "id": "event-uuid",
  "time": "2025-05-26T12:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "product_id": "uuid",
    "organization_id": "uuid",
    "title": "The Art of War",
    "status": "published",
    "marketplace_listings": [
      {"marketplace": "amazon_kdp", "listing_id": "uuid", "external_id": "B0XXXXX"}
    ],
    "published_at": "2025-05-26T12:00:00Z"
  }
}
```