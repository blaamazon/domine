import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SourceRegistryService } from './connectors/source-registry.service';
import { PipelineOrchestratorService } from './pipeline/pipeline-orchestrator.service';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sourceRegistry: SourceRegistryService,
    private readonly pipelineOrchestrator: PipelineOrchestratorService,
  ) {}

  async listSources() {
    return this.prisma.sourceAsset.findMany({
      orderBy: { discoveredAt: 'desc' },
      take: 100,
    });
  }

  async getSource(id: string) {
    const asset = await this.prisma.sourceAsset.findUnique({
      where: { id },
      include: {
        processedDocs: true,
        enrichmentJobs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!asset) throw new NotFoundException('Source asset not found');
    return asset;
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

  async triggerDiscovery(source: string, query: string, orgId: string) {
    const connector = this.sourceRegistry.get(source);
    const results = await connector.search({ query, limit: 20 });

    const created = [];
    for (const result of results) {
      const existing = await this.prisma.sourceAsset.findUnique({
        where: {
          organizationId_source_sourceId: {
            organizationId: orgId,
            source,
            sourceId: result.sourceId,
          },
        },
      });

      if (!existing) {
        const asset = await this.prisma.sourceAsset.create({
          data: {
            organizationId: orgId,
            source,
            sourceId: result.sourceId,
            title: result.title,
            author: result.author,
            description: result.description,
            originalUrl: result.url,
            contentType: result.contentType,
            licenseInfo: 'Public Domain',
            rawMetadata: result.metadata || {},
            status: 'discovered',
          },
        });
        created.push(asset);
      }
    }

    return {
      source,
      query,
      totalResults: results.length,
      newAssets: created.length,
      assets: created,
    };
  }

  async processAsset(assetId: string) {
    return this.pipelineOrchestrator.processAsset(assetId);
  }

  async processFromSource(source: string, sourceId: string, orgId: string) {
    return this.pipelineOrchestrator.processFromSource(source, sourceId, orgId);
  }

  async listTemplates() {
    return this.prisma.template.findMany();
  }

  async createTemplate(dto: any) {
    return this.prisma.template.create({ data: dto });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, dto: any) {
    const existing = await this.prisma.template.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    return this.prisma.template.update({ where: { id }, data: dto });
  }

  async listJobs() {
    return this.prisma.enrichmentJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getJob(id: string) {
    const job = await this.prisma.enrichmentJob.findUnique({
      where: { id },
      include: { sourceAsset: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  // Connector metadata
  async listConnectors() {
    return this.sourceRegistry.getAll().map((c) => ({
      code: c.code,
      name: c.name,
    }));
  }

  async searchSource(source: string, query: string) {
    const connector = this.sourceRegistry.get(source);
    return connector.search({ query, limit: 20 });
  }
}