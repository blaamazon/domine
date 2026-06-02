import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { GutenbergConnector } from './connectors/gutenberg.connector';
import { SourceRegistryService } from './connectors/source-registry.service';
import { PipelineOrchestratorService } from './pipeline/pipeline-orchestrator.service';
import { DownloadStage } from './pipeline/download-stage';
import { QualityGateStage } from './pipeline/quality-gate-stage';

@Module({
  controllers: [ContentController],
  providers: [
    ContentService,
    GutenbergConnector,
    SourceRegistryService,
    PipelineOrchestratorService,
    DownloadStage,
    QualityGateStage,
  ],
  exports: [ContentService, SourceRegistryService, PipelineOrchestratorService],
})
export class ContentModule {}