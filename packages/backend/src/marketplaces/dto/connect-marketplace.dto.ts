import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectMarketplaceDto {
  @ApiProperty({ example: 'amazon_kdp', description: 'Marketplace code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ description: 'Credentials for the marketplace connection' })
  @IsObject()
  credentials: Record<string, any>;

  @ApiPropertyOptional({ description: 'Marketplace-specific settings' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export class SyncListingDto {
  @ApiProperty({ description: 'Listing ID to sync' })
  @IsString()
  listingId: string;
}