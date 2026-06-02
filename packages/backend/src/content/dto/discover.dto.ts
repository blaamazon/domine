import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DiscoverDto {
  @ApiProperty({ example: 'gutenberg', description: 'Content source code' })
  @IsString()
  source: string;

  @ApiProperty({ example: 'philosophy', description: 'Search query or niche keyword' })
  @IsString()
  @MaxLength(500)
  query: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsUUID()
  @IsOptional()
  organizationId?: string;
}

export class ProcessAssetDto {
  @ApiProperty({ description: 'Source asset ID' })
  @IsUUID()
  assetId: string;
}