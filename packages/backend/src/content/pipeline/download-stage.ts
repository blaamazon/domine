import { Injectable, Logger } from '@nestjs/common';
import { PipelineStage, PipelineContext, PipelineResult } from './pipeline-stage.interface';
import { SourceRegistryService } from '../connectors/source-registry.service';

@Injectable()
export class DownloadStage implements PipelineStage {
  readonly name = 'download';
  private readonly logger = new Logger(DownloadStage.name);

  constructor(private readonly sourceRegistry: SourceRegistryService) {}

  async execute(context: PipelineContext): Promise<PipelineResult> {
    const startTime = Date.now();
    const { asset, config } = context;

    try {
      const connector = this.sourceRegistry.get(asset.source);
      const format = this.preferredFormat(asset.contentType, config);
      const downloadUrl = await connector.download(asset.sourceId, format);

      this.logger.log(`Downloaded ${asset.source}/${asset.sourceId} at ${downloadUrl}`);

      return {
        success: true,
        output: {
          url: downloadUrl,
          format,
          path: `raw/${asset.source}/${asset.sourceId}`,
        },
        metrics: { durationMs: Date.now() - startTime },
      };
    } catch (error: any) {
      this.logger.error(`Download failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        metrics: { durationMs: Date.now() - startTime },
      };
    }
  }

  private preferredFormat(contentType: string, _config: Record<string, any>): string {
    const formatMap: Record<string, string[]> = {
      book: ['epub', 'txt.utf-8', 'html', 'pdf'],
      image: ['jpeg', 'png', 'tiff'],
      music: ['mp3', 'flac', 'wav'],
      document: ['pdf', 'txt', 'html'],
    };
    return formatMap[contentType]?.[0] || 'txt';
  }
}