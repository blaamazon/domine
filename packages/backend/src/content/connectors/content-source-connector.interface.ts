import { Stream } from 'stream';

export interface SearchParams {
  query: string;
  niche?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  sourceId: string;
  title: string;
  author?: string;
  description?: string;
  contentType: string;
  url: string;
  thumbnailUrl?: string;
  language?: string;
  downloadFormats: string[];
  metadata: Record<string, any>;
  relevanceScore: number;
}

export interface AssetMetadata {
  sourceId: string;
  title: string;
  author?: string;
  description?: string;
  contentType: string;
  language?: string;
  publicationDate?: Date;
  licenseInfo: string;
  downloadUrls: Record<string, string>;
  rawMetadata: Record<string, any>;
}

export interface ContentSourceConnector {
  readonly code: string;
  readonly name: string;

  configure(config: Record<string, any>): void;

  search(params: SearchParams): Promise<SearchResult[]>;

  getById(sourceId: string): Promise<AssetMetadata>;

  getRelated(sourceId: string, limit?: number): Promise<AssetMetadata[]>;

  download(sourceId: string, format: string): Promise<Stream>;

  getMetadata(sourceId: string): Promise<AssetMetadata>;
}