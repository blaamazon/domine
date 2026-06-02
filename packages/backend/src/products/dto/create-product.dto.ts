import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'The Art of War - Illustrated Edition' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'sun-tzu-art-of-war-illustrated' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  slug?: string;

  @ApiPropertyOptional({ example: 'Sun Tzu\'s classic military treatise...' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'ebook', enum: ['ebook', 'print', 'art_print', 'audio', 'bundle'] })
  @IsString()
  productType: string;

  @ApiPropertyOptional({ description: 'Source asset UUID' })
  @IsUUID()
  @IsOptional()
  sourceAssetId?: string;

  @ApiPropertyOptional({ example: 'Sun Tzu' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  originalAuthor?: string;

  @ApiPropertyOptional({ example: -500 })
  @IsNumber()
  @IsOptional()
  originalYear?: number;

  @ApiPropertyOptional({ example: 499 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceCents?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: ['philosophy', 'warfare', 'ancient'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublicDomain?: boolean;
}