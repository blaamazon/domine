# Marketing Engine Design

## 1. Overview

The Marketing Engine is the autonomous system that handles the complete lead-to-customer journey without human intervention. It captures leads, segments audiences, runs multi-channel campaigns, and drives conversions with purchase reminders and follow-ups.

```
                     ┌───────────────────────────────┐
                     │   Marketing Engine (Core)      │
                     │                                │
  ┌──────────────┐  │  ┌─────────┐ ┌──────────┐     │  ┌─────────────────┐
  │ Landing Pg   │──┼─▶│ Lead    │─▶│ Segment  │─────┼─▶│ Campaign        │
  │ (Lead Capture)│  │  │ Capture │  │ Engine   │     │  │ Orchestrator     │
  └──────────────┘  │  └─────────┘ └──────────┘     │  └────────┬────────┘
                     │                                │           │
  ┌──────────────┐  │  ┌─────────┐ ┌──────────┐     │           ▼
  │ Social Posts │──┼─▶│ Content │ │Purchase  │─────┼─▶ ┌──────────────────┐
  │ (Organic)    │  │  │ Gen AI  │ │Reminders │     │  │  Email (SendGrid)│
  └──────────────┘  │  └─────────┘ └──────────┘     │  │  Social (Buffer) │
                     │                               │  │  Retarget (Pixels)│
  ┌──────────────┐  │  ┌─────────┐                   │  └──────────────────┘
  │ Backlink Gen │──┼─▶│Analytics│                   │
  └──────────────┘  │  │Tracker  │                   │
                     │  └─────────┘                   │
                     └───────────────────────────────┘
```

## 2. Lead Capture System

### 2.1 Capture Channels

| Channel | Description | Implementation |
|---------|-------------|---------------|
| Landing pages | Dedicated product landing pages with lead magnets | Hosted on Domine subdomain or custom domain |
| Embedded forms | Embeddable JS widget for external sites | `<script>` tag with webhook callback |
| Exit-intent popups | Modal triggered on exit intent | Client-side JS, configurable timing |
| Social lead ads | Lead generation forms on Facebook/Instagram/LinkedIn | Webhook integration with ad platforms |
| Email capture walls | Gated content (free chapter, sample) | Product previews that require email |
| Referral links | Tracked referral links for viral loops | UTM-based with affiliate cookie |

### 2.2 Lead Magnet Generation

For each product, the system auto-generates lead magnets:
- **Free chapter/sample** — first 20% of the content (for books)
- **Cheat sheet / summary** — AI-generated 1-page summary
- **Sample pack** — for art/music: watermarked low-resolution samples
- **Email course** — multi-part educational series based on content themes

### 2.3 Lead Scoring Model

Leads are scored 0-100 based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Email engagement | 25 pts | Open rate, click rate across campaigns |
| Page visits | 20 pts | Number of product pages viewed |
| Content consumption | 15 pts | Downloaded lead magnet, watched video |
| Source quality | 15 pts | Organic > referral > social > paid |
| Demographics fit | 10 pts | Segment match quality |
| Purchase history | 10 pts | Previous purchases |
| Recency | 5 pts | Time since last interaction |

**Scoring formula:**
```
lead_score = Σ(weight_i × normalized_factor_i)
```

Leads above 70 are "hot" (prioritized for sales outreach if enabled), 40-70 are "warm" (nurturing), below 40 are "cold" (re-engagement sequences).

## 3. Segmentation Engine

### 3.1 Segment Definition

Segments are dynamic (recalculated on every lead event) or static (manually selected leads).

**Built-in segments (auto-created):**

| Segment | Rule | Use Case |
|---------|------|----------|
| All Active Leads | status = 'active' | General campaigns |
| Engaged Readers | email_opens > 3 AND page_views > 2 | High-intent nurturing |
| Abandoned Browsers | page_views > 0 AND no purchase in 7d | Abandoned browse reminders |
| Recent Leads | created_at > 7 days ago | Welcome sequences |
| High Score | lead_score > 70 | Premium offers |
| Inactive | last_activity > 90 days | Re-engagement |
| Product Interested | lead viewed specific product category | Cross-sell |

### 3.2 Segment Rule Engine

Rules support AND/OR logic across any lead field:

```json
{
  "name": "High-Intent Art Buyers",
  "match_logic": "and",
  "rules": [
    {"field": "source", "operator": "in", "value": ["organic", "referral"]},
    {"field": "page_views", "operator": "gte", "value": 3},
    {"field": "lead_score", "operator": "gte", "value": 50},
    {"field": "status", "operator": "eq", "value": "active"}
  ]
}
```

Dynamic segments are re-evaluated via a background job every 5 minutes (or on-demand via API).

## 4. Campaign Orchestrator

### 4.1 Campaign Types

| Type | Description | Typical Steps |
|------|-------------|---------------|
| **Email Drip** | Multi-step email sequence | Welcome → Value → Offer → Follow-up → Last chance |
| **Social Campaign** | Scheduled social media posts | 3-5 posts across platforms over 2 weeks |
| **Abandoned Browse** | Recover visitors who browsed but didn't buy | Reminder email (1h) → Social retarget (24h) → Discount offer (72h) |
| **Welcome Series** | New subscriber onboarding | Welcome email (0h) → Value (24h) → Product intro (48h) → Offer (72h) |
| **Re-engagement** | Win back inactive leads | "We miss you" (day 0) → What's new (day 3) → Special offer (day 7) |
| **Launch Sequence** | New product announcement | Teaser (T-7d) → Launch (T-0) → Social proof (T+2d) → Urgency (T+5d) |

### 4.2 Step Types in a Campaign

| Step Type | Purpose | Configuration |
|-----------|---------|---------------|
| `wait` | Delay before next step | Duration in hours |
| `email` | Send email from template | Template ID, subject, sender |
| `social_post` | Schedule social media post | Platform, content, media |
| `condition` | Branch based on lead behavior | Field + operator + value; leads that don't match skip to next |
| `update_segment` | Move lead to different segment | Target segment ID |
| `webhook` | External integration call | URL, payload, method |
| `update_score` | Adjust lead score | +/- value |
| `ab_test` | Split test (A/B) | Variant A step, Variant B step, split ratio |

### 4.3 Campaign Example: Email Drip for an eBook

```
Step 1 (0h): Wait 0 hours (immediate)
  → Step 2: Email — Welcome + Free Chapter download link
  → Step 3: Wait 24 hours
  → Step 4: CONDITION — if opened email OR clicked → GOTO Step 6, else → Step 5
  → Step 5: Email — "Did you miss this?" (different subject line)
  → Step 6: Wait 48 hours
  → Step 7: Email — Full product details + reviews
  → Step 8: Wait 72 hours
  → Step 9: Email — "Limited time offer" (discount code)
  → Step 10: Wait 7 days
  → Step 11: Email — "Last chance" (expiring offer)
  → Step 12: Move to "Inactive" segment if no purchase
```

### 4.4 Campaign Execution Engine

The orchestrator runs as a scheduled job (via the Scheduler Service):

1. Every 5 minutes, query for campaign steps that are due
2. For each due step:
   a. Load the step's campaign and target segment
   b. Query segment members
   c. Execute the step (send email, schedule social post, etc.)
   d. Log delivery results in `analytics.events`
   e. Update lead `last_activity` timestamp
   f. Schedule next step's execution time per lead
3. Track campaign progress: sent, opened, clicked, converted counts
4. Apply rate limiting (max emails per lead per day)

## 5. Email Delivery System

### 5.1 Email Provider

- **Primary**: SendGrid (for high deliverability, transactional + marketing)
- **Fallback**: AWS SES (for cost efficiency on large volumes)
- **Bounce/Complaint handling**: Webhook-based automatic unsubscribe

### 5.2 Email Templates

- Built-in template library (5-10 responsive templates)
- Custom templates via drag-and-drop editor or raw HTML/CSS
- Template variables: `{{lead.first_name}}`, `{{product.title}}`, `{{product.price}}`, `{{landing_page.url}}`, `{{unsubscribe_url}}`

### 5.3 Deliverability

- **DKIM/SPF/DMARC**: Auto-configured per sending domain
- **Warmup**: Gradual sending volume increase for new domains
- **Bounce processing**: Hard bounces → auto-unsubscribe, soft bounces → retry 3x
- **Complaint handling**: One-click unsubscribe (List-Unsubscribe header) + immediate suppression
- **Send time optimization**: Send during recipient's local business hours (based on timezone detection)

## 6. Social Media System

### 6.1 Integrated Platforms

| Platform | API Integration | Content Types |
|----------|----------------|---------------|
| Twitter/X | Twitter API v2 | Threads, single posts with images |
| Facebook | Graph API | Link posts, image posts, carousel |
| Instagram | Instagram Graph API | Image posts, carousel, stories |
| LinkedIn | LinkedIn Marketing API | Articles, link posts, images |
| Pinterest | Pinterest API | Pins with product links |
| TikTok (future) | TikTok Business API | Video posts |

### 6.2 Content Generation for Social

Per product, the system auto-generates:

- **5-10 social posts** tailored to each platform's style
- **Visual assets**: Product cover image, quote cards, before/after comparison
- **Hashtag recommendations**: Platform-specific trending hashtags
- **Posting schedule**: Optimal times per platform (researched defaults)

AI-generated posts via LLM:

```json
{
  "post_type": "educational",
  "platform": "twitter",
  "content": "☀️ Did you know? Sun Tzu's 'The Art of War' was written over 2,500 years ago, yet its strategies are used by modern CEOs and military leaders alike.\n\nGrab your illustrated copy → {link}",
  "media": "quote_card_sun_tzu.png",
  "best_time": "2025-05-27T12:00:00Z",
  "hashtags": ["#SunTzu", "#Leadership", "#ClassicLiterature", "#PublicDomain"]
}
```

### 6.3 Scheduling & Publishing

- **Buffer integration**: For unified social scheduling across platforms
- **Direct API posting**: For platforms where Buffer isn't optimal
- **Queue management**: Posts queued 2 weeks in advance, configurable cadence
- **Best-time posting**: Platform-specific optimal posting times with A/B testing

## 7. Purchase Reminders

### 7.1 Reminder Types

| Type | Trigger | Sequence |
|------|---------|----------|
| Browse abandonment | Visitor views product but leaves without purchase | Email @ 1h → Email @ 24h → Social retargeting |
| Cart abandonment | Visitor adds to cart (where cart exists) | Email @ 30min → Email @ 4h → SMS @ 24h (opt-in) |
| Price drop | Product price changes | Instant notification |
| Back in stock | Product becomes available again | Instant notification |
| Re-engagement | No purchase in 90 days | Email @ day 0 → Email @ day 7 → Offer @ day 14 |
| Cross-sell | Purchase of one product triggers related product suggestion | Email @ 7 days post-purchase |
| Win-back | No activity in 180 days | Email with special incentive |

### 7.2 Reminder Logic

```python
# Pseudocode for browse abandonment
def check_browse_abandonment(lead, product):
    if lead.viewed_product(product) and not lead.purchased(product):
        time_since_last_view = now() - lead.last_view_time(product)
        
        if 1h <= time_since_last_view < 2h and not sent_reminder(1):
            send_reminder(lead, product, "Did you enjoy {product.title}?")
            log_reminder_sent(lead, product, 1)
            
        elif 24h <= time_since_last_view < 26h and sent_reminder(1) and not sent_reminder(2):
            if lead.opened_reminder(1):
                send_reminder(lead, product, "Still thinking? Here's what readers say...")
            else:
                send_reminder(lead, product, "Different subject line approach...")
            log_reminder_sent(lead, product, 2)
            
        elif 72h <= time_since_last_view < 74h and sent_reminder(2) and not sent_reminder(3):
            send_reminder(lead, product, "Final chance: special discount just for you")
            log_reminder_sent(lead, product, 3)
```

### 7.3 Rate Limiting for Reminders

- Max 3 reminder emails per product per lead
- Max 1 reminder per 12-hour window
- Auto-disable reminders if lead has unsubscribed or bounced in last 30 days

## 8. Backlink Generation

### 8.1 Automated Backlink Strategy

| Channel | Method | Frequency |
|---------|--------|-----------|
| Blog posts | Generate blog articles using product content as source | 2-4 per product |
| Guest posts | Submit to relevant directories and article platforms | 1-2 per product |
| Social bookmarks | Submit to Digg, Reddit, StumbleUpon-style platforms | Per launch |
| Q&A platforms | Answer questions on Quora, Stack Exchange with product link | Ongoing |
| Press releases | Distribute new product announcements | Per new product |

### 8.2 Content Generation for Backlinks

Uses LLM + structured templates:

1. **Blog post**: "5 Life Lessons from {Product Title}" / "The History Behind {Product Title}"
2. **Quora answer**: Extract relevant passage from content, attribute, include link
3. **Directory submission**: Title + description + category + tags

### 8.3 Quality Scoring

Backlinks are scored by:
- Domain authority of target site
- Do-follow vs no-follow
- Relevance to product niche
- Position on page

Target: at least 5-10 quality backlinks per product within 30 days of launch.

## 9. Conversion Funnel

### 9.1 Funnel Stages

```
Awareness (Social/SEO) → Interest (Landing Page) → Desire (Lead Magnet) 
→ Action (Email Campaign) → Purchase → Retention (Follow-up)
```

### 9.2 Funnel KPIs per Campaign

| Stage | Metric | Target |
|-------|--------|--------|
| Awareness | Impressions, reach, social engagement | Varies by platform |
| Interest | Landing page visits, time on page | Bounce rate < 50% |
| Desire | Lead magnet downloads, email sign-ups | Conversion rate > 5% |
| Action | Email open rate, click rate | Open > 25%, Click > 3% |
| Purchase | Conversion rate from click | > 2% |
| Retention | Repeat purchase rate, unsub rate | Repeat > 10%, Unsub < 0.5% |

### 9.3 Attribution Model

- **Default**: Last-touch attribution (most common for SaaS)
- **Advanced**: Multi-touch with configurable attribution window (7/14/30 days)
- **Touch weighting**: Time-decay model (closer to conversion = more weight)

## 10. Marketing Analytics & Reporting

### 10.1 Real-time Dashboard Metrics

- Active campaigns and their status
- Lead acquisition rate (new leads/hour)
- Email performance (opens, clicks, unsubscribes) in last 24h
- Purchase reminders sent and converted
- Social post engagement
- Revenue attribution by channel

### 10.2 Scheduled Reports

| Report | Frequency | Recipients |
|--------|-----------|------------|
| Weekly marketing digest | Every Monday | User email |
| Monthly performance report | 1st of month | User email + dashboard |
| Campaign completion report | On campaign end | User notification |
| Abandoned browse recovery rate | Weekly | Dashboard |
| Lead score distribution | Weekly | Dashboard |

### 10.3 Automated Optimization

The Marketing Engine continuously tests and optimizes:

- **Subject line A/B testing**: Every email campaign automatically tests 2-3 subject lines
- **Send time optimization**: Tracks open rates by time/day and adjusts future sends
- **CTA placement**: Tests button text, color, position on landing pages
- **Price testing**: Low-commitment A/B price testing (with configurable limits)
- **Content personalization**: Dynamic content blocks based on lead segment