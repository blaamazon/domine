import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsString()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}