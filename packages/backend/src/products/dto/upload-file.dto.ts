import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({ example: 'pdf', enum: ['pdf', 'epub', 'mobi', 'mp3', 'png', 'jpg'] })
  @IsString()
  fileType: string;

  @ApiProperty({ description: 'URL or S3 key of the file' })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsNumber()
  @IsOptional()
  fileSizeBytes?: number;

  @ApiPropertyOptional({ description: 'SHA-256 checksum' })
  @IsString()
  @IsOptional()
  checksumSha256?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPreview?: boolean;
}