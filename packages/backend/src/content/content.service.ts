import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listSources() {
    return this.prisma.sourceAsset.findMany({
      orderBy: { discoveredAt: 'desc' },
    });
  }

  async registerSource(dto: any) {
    return this.prisma.sourceAsset.create({
      data: {
        organizationId: dto.organizationId,
        source: dto.source,
        sourceId: dto.sourceId,
        title: dto.title,
        author: dto.author,
        description: dto.description,
        originalUrl: dto.originalUrl,
        contentType: dto.contentType,
        licenseInfo: dto.licenseInfo || 'Public Domain',
        rawMetadata: dto.rawMetadata || {},
      },
    });
  }

  async getSource(id: string) {
    return this.prisma.sourceAsset.findUnique({
      where: { id },
      include: { processedDocs: true, enrichmentJobs: true },
    });
  }

  async processSource(id: string) {
    // Stub: trigger processing pipeline
    return { message: 'Processing initiated', sourceAssetId: id };
  }

  async listTemplates() {
    return this.prisma.template.findMany();
  }

  async createTemplate(dto: any) {
    return this.prisma.template.create({ data: dto });
  }

  async listJobs() {
    return this.prisma.enrichmentJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}