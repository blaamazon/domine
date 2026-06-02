import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ContentSourceConnector,
  SearchParams,
  SearchResult,
  AssetMetadata,
} from './content-source-connector.interface';

@Injectable()
export class GutenbergConnector implements ContentSourceConnector {
  readonly code = 'gutenberg';
  readonly name = 'Project Gutenberg';
  private readonly logger = new Logger(GutenbergConnector.name);

  // Gutenberg API endpoints
  private readonly apiBase = 'https://gutendex.com';
  private readonly bookUrl = 'https://www.gutenberg.org/ebooks';

  private config: Record<string, any> = {};

  configure(config: Record<string, any>): void {
    this.config = config;
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    const { query, limit = 25, niche } = params;
    this.logger.log(`Searching Gutenberg: "${query}" (niche: ${niche || 'none'})`);

    try {
      const searchQuery = niche ? `${query} ${niche}` : query;
      const response = await axios.get(`${this.apiBase}/books`, {
        params: {
          search: searchQuery,
          page_size: limit,
        },
        timeout: 10000,
      });

      const books = response.data?.results || [];
      return books.map((book: any) => this.mapBookToSearchResult(book));
    } catch (error: any) {
      this.logger.error(`Gutenberg search failed: ${error.message}`);
      return [];
    }
  }

  async getById(sourceId: string): Promise<AssetMetadata> {
    try {
      const response = await axios.get(`${this.apiBase}/books/${sourceId}`, {
        timeout: 10000,
      });
      return this.mapBookToMetadata(response.data);
    } catch (error: any) {
      this.logger.error(`Gutenberg getById(${sourceId}) failed: ${error.message}`);
      throw new Error(`Failed to fetch Gutenberg book ${sourceId}`);
    }
  }

  async getRelated(sourceId: string, limit = 5): Promise<AssetMetadata[]> {
    try {
      // Get the book first to extract subjects/authors
      const book = await this.getById(sourceId);
      const subjects = book.rawMetadata?.subjects || [];

      if (subjects.length === 0) return [];

      // Search using the first subject
      const results = await this.search({ query: subjects[0], limit });
      // Filter out the original book
      return results
        .filter((r) => r.sourceId !== sourceId)
        .slice(0, limit)
        .map((r) => ({
          sourceId: r.sourceId,
          title: r.title,
          author: r.author,
          contentType: r.contentType,
          licenseInfo: 'Public Domain',
          downloadUrls: {},
          rawMetadata: {},
        }));
    } catch (error: any) {
      this.logger.error(`getRelated failed: ${error.message}`);
      return [];
    }
  }

  async download(sourceId: string, format: string): Promise<any> {
    // Return a download URL — actual streaming handled by pipeline
    const formatMap: Record<string, string> = {
      epub: `${this.bookUrl}/${sourceId}.epub.noimages`,
      pdf: `${this.bookUrl}/${sourceId}.pdf`,
      html: `${this.bookUrl}/${sourceId}.html`,
      txt: `${this.bookUrl}/${sourceId}.txt.utf-8`,
      'epub.images': `${this.bookUrl}/${sourceId}.epub.images`,
    };

    const url = formatMap[format] || formatMap['txt'];
    this.logger.log(`Gutenberg download URL for ${sourceId} (${format}): ${url}`);
    return url;
  }

  async getMetadata(sourceId: string): Promise<AssetMetadata> {
    return this.getById(sourceId);
  }

  private mapBookToSearchResult(book: any): SearchResult {
    return {
      sourceId: String(book.id),
      title: book.title || 'Unknown Title',
      author: book.authors?.[0]?.name || 'Unknown Author',
      description: book.subjects?.slice(0, 3).join(', ') || '',
      contentType: 'book',
      url: `${this.bookUrl}/${book.id}`,
      thumbnailUrl: book.formats?.['image/jpeg'] || null,
      language: book.languages?.[0] || 'en',
      downloadFormats: Object.keys(book.formats || {}).map((key) => {
        const extMap: Record<string, string> = {
          'application/epub+zip': 'epub',
          'application/pdf': 'pdf',
          'text/html': 'html',
          'text/plain; charset=utf-8': 'txt',
          'text/plain': 'txt',
          'application/x-mobipocket-ebook': 'mobi',
        };
        return extMap[key] || key;
      }),
      metadata: {
        subjects: book.subjects || [],
        bookshelves: book.bookshelves || [],
        downloadCount: book.download_count,
      },
      relevanceScore: 0.8,
    };
  }

  private mapBookToMetadata(book: any): AssetMetadata {
    return {
      sourceId: String(book.id),
      title: book.title || 'Unknown Title',
      author: book.authors?.[0]?.name || 'Unknown Author',
      description: book.subjects?.slice(0, 3).join(', ') || '',
      contentType: 'book',
      language: book.languages?.[0] || 'en',
      publicationDate: book.publication_date ? new Date(book.publication_date) : undefined,
      licenseInfo: 'Public Domain',
      downloadUrls: book.formats || {},
      rawMetadata: book,
    };
  }
}