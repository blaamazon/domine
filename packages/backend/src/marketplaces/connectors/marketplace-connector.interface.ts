export interface ConnectorConfig {
  credentials: Record<string, any>;
  settings: Record<string, any>;
}

export interface ConnectorCapability {
  supportsMultipleFormats: boolean;
  supportsPricing: boolean;
  supportsInventory: boolean;
  supportsOrders: boolean;
  supportsReviews: boolean;
  maxListingsPerBatch: number;
  rateLimitPerHour: number;
  requiredApproval: boolean;
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'string' | 'password' | 'select' | 'boolean';
  required: boolean;
  description?: string;
  options?: string[];
}

export interface ListingResult {
  externalId: string;
  listingUrl?: string;
  status: string;
  errors?: string[];
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
  connectionData?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ listingId: string; error: string }>;
}

export interface WebhookResult {
  handled: boolean;
  action?: string;
  data?: any;
}

export interface MarketplaceConnector {
  readonly code: string;
  readonly name: string;

  connect(config: ConnectorConfig): Promise<ConnectionResult>;
  disconnect(connectionId: string): Promise<void>;
  validate(config: ConnectorConfig): Promise<ValidationResult>;

  createListing(product: any, config: ConnectorConfig): Promise<ListingResult>;
  updateListing(listing: any, product: any): Promise<ListingResult>;
  deleteListing(listing: any): Promise<void>;
  getListingStatus(listing: any): Promise<string>;

  syncInventory(listings: any[]): Promise<SyncResult>;
  fetchOrders(since: Date): Promise<any[]>;

  handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookResult>;

  getRequiredConfigFields(): ConfigField[];
  getCapabilities(): ConnectorCapability;
}