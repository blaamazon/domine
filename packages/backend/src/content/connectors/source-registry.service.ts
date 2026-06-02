import { Injectable, Logger } from '@nestjs/common';
import { ContentSourceConnector } from './content-source-connector.interface';
import { GutenbergConnector } from './gutenberg.connector';

@Injectable()
export class SourceRegistryService {
  private readonly logger = new Logger(SourceRegistryService.name);
  private connectors = new Map<string, ContentSourceConnector>();

  constructor(gutenbergConnector: GutenbergConnector) {
    this.register(gutenbergConnector);
    // Future: register wikimedia, archive_org, loc, musopen connectors
  }

  register(connector: ContentSourceConnector): void {
    this.connectors.set(connector.code, connector);
    this.logger.log(`Registered source connector: ${connector.code} (${connector.name})`);
  }

  get(code: string): ContentSourceConnector {
    const connector = this.connectors.get(code);
    if (!connector) {
      throw new Error(`Unknown content source: ${code}. Available: ${this.list().join(', ')}`);
    }
    return connector;
  }

  list(): string[] {
    return Array.from(this.connectors.keys());
  }

  getAll(): ContentSourceConnector[] {
    return Array.from(this.connectors.values());
  }
}