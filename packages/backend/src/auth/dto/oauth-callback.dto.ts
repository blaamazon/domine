import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  @IsString()
  state: string;
}