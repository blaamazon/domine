import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceConnector } from './marketplace-connector.interface';
import { AmazonKdpConnector } from './amazon-kdp.connector';

@Injectable()
export class ConnectorRegistryService {
  private readonly logger = new Logger(ConnectorRegistryService.name);
  private connectors = new Map<string, MarketplaceConnector>();

  constructor(amazonKdpConnector: AmazonKdpConnector) {
    this.register(amazonKdpConnector);
    // Future: register etsy, shopify, gumroad, ebay connectors
  }

  register(connector: MarketplaceConnector): void {
    this.connectors.set(connector.code, connector);
    this.logger.log(`Registered marketplace connector: ${connector.code}`);
  }

  get(code: string): MarketplaceConnector {
    const connector = this.connectors.get(code);
    if (!connector) {
      throw new Error(`Unknown marketplace: ${code}. Available: ${this.list().join(', ')}`);
    }
    return connector;
  }

  list(): string[] {
    return Array.from(this.connectors.keys());
  }

  getAll(): MarketplaceConnector[] {
    return Array.from(this.connectors.values());
  }
}