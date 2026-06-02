import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DownloadStage } from './download-stage';
import { QualityGateStage } from './quality-gate-stage';
import { PipelineStage } from './pipeline-stage.interface';

@Injectable()
export class PipelineOrchestratorService {
  private readonly logger = new Logger(PipelineOrchestratorService.name);
  private stages: PipelineStage[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly downloadStage: DownloadStage,
    private readonly qualityGateStage: QualityGateStage,
  ) {
    this.stages = [
      downloadStage,
      qualityGateStage,
    ];
    // Future stages: ValidateStage, ExtractStage, NormalizeStage,
    //   EnrichStage (AI tagging, summaries), ConvertStage (format conversion)
  }

  async processAsset(assetId: string, config: Record<string, any> = {}): Promise<any> {
    const asset = await this.prisma.sourceAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    this.logger.log(`Starting pipeline for ${asset.source}/${asset.sourceId}`);
    
    await this.prisma.sourceAsset.update({
      where: { id: assetId },
      data: { status: 'processing' },
    });

    const context = {
      asset,
      rawFilePath: `raw/${asset.source}/${asset.sourceId}`,
      processedDir: `processed/${asset.id}`,
      config,
    };

    const results: any[] = [];

    for (const stage of this.stages) {
      this.logger.log(`Running stage: ${stage.name}`);

      const result = await stage.execute(context);
      results.push({ stage: stage.name, ...result });

      if (!result.success && stage.name !== 'quality-gate') {
        this.logger.warn(`Stage ${stage.name} failed, marking asset as failed`);
        await this.prisma.sourceAsset.update({
          where: { id: assetId },
          data: { status: 'failed', errorMessage: result.error },
        });

        // Create failure enrichment job entry
        await this.prisma.enrichmentJob.create({
          data: {
            sourceAssetId: assetId,
            jobType: `pipeline.${stage.name}`,
            status: 'failed',
            result: { error: result.error, stage: stage.name },
          },
        });

        return { assetId, status: 'failed', stages: results };
      }
    }

    // Pipeline complete
    const finalResult = results[results.length - 1];
    if (finalResult?.output?.passed) {
      await this.prisma.sourceAsset.update({
        where: { id: assetId },
        data: { status: 'ready' },
      });

      await this.prisma.enrichmentJob.create({
        data: {
          sourceAssetId: assetId,
          jobType: 'pipeline.complete',
          status: 'completed',
          result: { stages: results, qualityScore: finalResult.output.qualityScore },
        },
      });
    }

    return { assetId, status: 'ready', stages: results };
  }

  async processFromSource(
    source: string,
    sourceId: string,
    organizationId: string,
  ): Promise<any> {
    // Find or create the source asset
    let asset = await this.prisma.sourceAsset.findUnique({
      where: {
        organizationId_source_sourceId: {
          organizationId,
          source,
          sourceId,
        },
      },
    });

    if (!asset) {
      asset = await this.prisma.sourceAsset.create({
        data: {
          organizationId,
          source,
          sourceId,
          title: `Processing ${source} ${sourceId}`,
          contentType: 'book',
          status: 'discovered',
        },
      });
    }

    return this.processAsset(asset.id);
  }

  async discoverAndProcess(
    source: string,
    organizationId: string,
    query: string,
  ): Promise<any> {
    // Discovery is handled by the source connector
    // This would be triggered by the scheduler or manually
    return {
      message: `Discovery job queued for ${source} with query "${query}"`,
      source,
      organizationId,
    };
  }
}