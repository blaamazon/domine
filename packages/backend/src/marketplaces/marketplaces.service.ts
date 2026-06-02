import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConnectorRegistryService } from './connectors/connector-registry.service';

@Injectable()
export class MarketplacesService {
  private readonly logger = new Logger(MarketplacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorRegistry: ConnectorRegistryService,
  ) {}

  async listMarketplaces() {
    return this.prisma.marketplace.findMany({ where: { isActive: true } });
  }

  async getConnectorInfo(code: string) {
    const connector = this.connectorRegistry.get(code);
    return {
      code: connector.code,
      name: connector.name,
      configFields: connector.getRequiredConfigFields(),
      capabilities: connector.getCapabilities(),
    };
  }

  async listConnectors(orgId: string) {
    return this.prisma.connectorConfig.findMany({
      where: { organizationId: orgId },
      include: {
        marketplace: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async connectMarketplace(orgId: string, marketplaceCode: string, credentials: Record<string, any>, settings?: Record<string, any>) {
    const marketplace = await this.prisma.marketplace.findUnique({
      where: { code: marketplaceCode },
    });

    if (!marketplace) {
      throw new NotFoundException(`Marketplace "${marketplaceCode}" not found`);
    }

    const connector = this.connectorRegistry.get(marketplaceCode);

    // Validate credentials
    const validation = await connector.validate({ credentials, settings: settings || {} });
    if (!validation.valid) {
      throw new BadRequestException(
        `Invalid marketplace configuration: ${validation.errors.map((e) => e.message).join(', ')}`,
      );
    }

    // Upsert the connector config
    const config = await this.prisma.connectorConfig.upsert({
      where: {
        organizationId_marketplaceId: {
          organizationId: orgId,
          marketplaceId: marketplace.id,
        },
      },
      update: {
        credentials,
        settings: settings || {},
        isEnabled: true,
      },
      create: {
        organizationId: orgId,
        marketplaceId: marketplace.id,
        credentials,
        settings: settings || {},
        isEnabled: true,
      },
      include: {
        marketplace: { select: { id: true, name: true, code: true } },
      },
    });

    return config;
  }

  async disconnectMarketplace(orgId: string, configId: string) {
    const config = await this.prisma.connectorConfig.findUnique({
      where: { id: configId },
    });

    if (!config || config.organizationId !== orgId) {
      throw new NotFoundException('Connector config not found');
    }

    const connector = this.connectorRegistry.get(
      (await this.prisma.marketplace.findUnique({ where: { id: config.marketplaceId } }))?.code || '',
    );

    await connector.disconnect(configId);

    await this.prisma.connectorConfig.update({
      where: { id: configId },
      data: { isEnabled: false },
    });

    return { message: 'Marketplace disconnected' };
  }

  async updateConnector(id: string, dto: any) {
    return this.prisma.connectorConfig.update({
      where: { id },
      data: dto,
      include: {
        marketplace: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async deleteConnector(id: string) {
    await this.prisma.connectorConfig.delete({ where: { id } });
    return { message: 'Connector config deleted' };
  }

  async listListings(orgId: string) {
    return this.prisma.listing.findMany({
      where: { organizationId: orgId },
      include: {
        product: { select: { id: true, title: true, slug: true } },
        marketplace: { select: { id: true, name: true, code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getListing(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        product: true,
        marketplace: true,
        orders: { orderBy: { orderedAt: 'desc' }, take: 10 },
        syncLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async syncListing(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { product: true, marketplace: true, connectorCfg: true },
    });

    if (!listing) throw new NotFoundException('Listing not found');

    const connector = this.connectorRegistry.get(listing.marketplace.code);
    const startTime = Date.now();

    // Create sync log entry
    const syncLog = await this.prisma.listingSyncLog.create({
      data: {
        listingId: listing.id,
        syncType: 'push',
        status: 'in_progress',
        requestData: { product: { id: listing.product.id, title: listing.product.title } },
      },
    });

    try {
      const config = {
        credentials: listing.connectorCfg.credentials as Record<string, any>,
        settings: listing.connectorCfg.settings as Record<string, any>,
      };

      let result: any;
      if (listing.externalId) {
        result = await connector.updateListing(listing, listing.product);
      } else {
        result = await connector.createListing(listing.product, config);
      }

      const durationMs = Date.now() - startTime;

      await this.prisma.listing.update({
        where: { id: listingId },
        data: {
          externalId: result.externalId || listing.externalId,
          listingUrl: result.listingUrl || listing.listingUrl,
          status: result.status || 'active',
          syncStatus: 'success',
        },
      });

      await this.prisma.listingSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'success',
          responseData: result,
          durationMs,
        },
      });

      return { listingId, status: 'synced', result };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      await this.prisma.listing.update({
        where: { id: listingId },
        data: { syncStatus: 'failed', syncError: error.message },
      });

      await this.prisma.listingSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          durationMs,
        },
      });

      throw error;
    }
  }

  async listOrders(listingId: string) {
    return this.prisma.listingOrder.findMany({
      where: { listingId },
      orderBy: { orderedAt: 'desc' },
    });
  }

  async listAllOrders(orgId: string) {
    return this.prisma.listingOrder.findMany({
      where: { listing: { organizationId: orgId } },
      include: {
        listing: {
          include: {
            product: { select: { id: true, title: true } },
            marketplace: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { orderedAt: 'desc' },
      take: 100,
    });
  }

  async createListingForProduct(productId: string, marketplaceCode: string, orgId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const marketplace = await this.prisma.marketplace.findUnique({ where: { code: marketplaceCode } });
    if (!marketplace) throw new NotFoundException(`Marketplace "${marketplaceCode}" not found`);

    const connectorConfig = await this.prisma.connectorConfig.findUnique({
      where: {
        organizationId_marketplaceId: {
          organizationId: orgId,
          marketplaceId: marketplace.id,
        },
      },
    });

    if (!connectorConfig) {
      throw new BadRequestException('Connect to this marketplace first');
    }

    const listing = await this.prisma.listing.create({
      data: {
        productId: product.id,
        marketplaceId: marketplace.id,
        organizationId: orgId,
        connectorCfgId: connectorConfig.id,
        title: product.title,
        priceCents: product.priceCents,
        currency: product.currency || 'USD',
        status: 'pending',
      },
    });

    return listing;
  }
}