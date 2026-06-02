// Shared types for Domine monorepo
// These types are used across backend, frontend, and worker packages

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export type ProductType = 'ebook' | 'print' | 'art_print' | 'audio' | 'bundle';

export type ProductStatus = 'draft' | 'review' | 'published' | 'archived';

export type ListingStatus = 'pending' | 'syncing' | 'active' | 'rejected' | 'paused' | 'ended';

export type CampaignType = 'email_drip' | 'social' | 'retargeting' | 'abandoned_cart';

export type ContentSource = 'gutenberg' | 'wikimedia' | 'archive_org' | 'loc' | 'musopen';

export type ContentType = 'book' | 'image' | 'music' | 'document';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
    pagination?: {
      cursor?: string;
      has_more: boolean;
    };
  };
  errors: Array<{ code: string; field?: string; message: string }> | null;
}