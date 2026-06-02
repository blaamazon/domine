import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MarketplacesService {
  private readonly logger = new Logger(MarketplacesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listMarketplaces() {
    return this.prisma.marketplace.findMany({ where: { isActive: true } });
  }

  async listConnectors() {
    return this.prisma.connectorConfig.findMany({
      include: { marketplace: true },
    });
  }

  async createConnector(dto: any) {
    return this.prisma.connectorConfig.create({
      data: {
        organizationId: dto.organizationId,
        marketplaceId: dto.marketplaceId,
        credentials: dto.credentials || {},
        settings: dto.settings || {},
      },
    });
  }

  async updateConnector(id: string, dto: any) {
    return this.prisma.connectorConfig.update({
      where: { id },
      data: dto,
    });
  }

  async deleteConnector(id: string) {
    return this.prisma.connectorConfig.delete({ where: { id } });
  }

  async listListings() {
    return this.prisma.listing.findMany({
      include: { product: true, marketplace: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async syncListing(id: string) {
    // Stub: trigger marketplace sync
    return { message: 'Sync initiated', listingId: id };
  }
}