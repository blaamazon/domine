import { IsString, IsOptional, IsNumber, IsArray, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBundleDto {
  @ApiProperty({ example: 'Classic Philosophy Collection' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'fixed', enum: ['fixed', 'pick_x', 'subscription'] })
  @IsString()
  bundleType: string;

  @ApiPropertyOptional({ example: 1999 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountCents?: number;

  @ApiProperty({ description: 'Product IDs to include in the bundle' })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];
}