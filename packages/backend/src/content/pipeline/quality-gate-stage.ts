import { Injectable, Logger } from '@nestjs/common';
import { PipelineStage, PipelineContext, PipelineResult } from './pipeline-stage.interface';

@Injectable()
export class QualityGateStage implements PipelineStage {
  readonly name = 'quality-gate';
  private readonly logger = new Logger(QualityGateStage.name);

  async execute(context: PipelineContext): Promise<PipelineResult> {
    const startTime = Date.now();
    const { asset } = context;

    try {
      // Basic quality checks
      const checks = {
        hasTitle: !!asset.title,
        hasContentType: !!asset.contentType,
        hasSourceId: !!asset.sourceId,
        sourceTrusted: ['gutenberg', 'wikimedia', 'archive_org', 'loc', 'musopen'].includes(asset.source),
      };

      const passedChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.values(checks).length;
      const qualityScore = passedChecks / totalChecks;

      this.logger.log(`Quality gate for ${asset.source}/${asset.sourceId}: score=${qualityScore.toFixed(2)}`);

      return {
        success: qualityScore >= 0.5,
        output: {
          qualityScore,
          checks,
          passed: qualityScore >= 0.5,
        },
        metrics: { durationMs: Date.now() - startTime },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metrics: { durationMs: Date.now() - startTime },
      };
    }
  }
}