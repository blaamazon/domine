import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'My Publishing Co.', description: 'Organization name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'my-publishing-co', description: 'URL-friendly slug' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  slug?: string;
}