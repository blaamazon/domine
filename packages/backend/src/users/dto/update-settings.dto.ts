import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Timezone (e.g., America/New_York)' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Locale (e.g., en-US)' })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({ description: 'Theme (light/dark)' })
  @IsString()
  @IsOptional()
  theme?: string;

  @ApiPropertyOptional({ description: 'Notification preferences' })
  @IsObject()
  @IsOptional()
  notificationPrefs?: Record<string, boolean>;
}