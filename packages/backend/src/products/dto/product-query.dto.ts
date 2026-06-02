import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProductQueryDto {
  @ApiPropertyOptional({ enum: ['draft', 'review', 'published', 'archived'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['ebook', 'print', 'art_print', 'audio', 'bundle'] })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Tag filter' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: 'Full-text search query' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: 'Pagination cursor' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size (default 20, max 100)', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field (created_at, title, price; default -created_at)' })
  @IsString()
  @IsOptional()
  sort?: string;
}