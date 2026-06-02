import { SourceAsset } from '@prisma/client';

export interface PipelineContext {
  asset: SourceAsset;
  rawFilePath: string;
  processedDir: string;
  config: Record<string, any>;
}

export interface PipelineResult {
  success: boolean;
  output?: any;
  error?: string;
  metrics?: {
    durationMs: number;
    outputSize?: number;
  };
}

export interface PipelineStage {
  readonly name: string;
  execute(context: PipelineContext): Promise<PipelineResult>;
}