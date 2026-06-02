import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({ example: 'collaborator@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'member', enum: ['owner', 'admin', 'member', 'viewer'] })
  @IsString()
  @IsOptional()
  @IsIn(['owner', 'admin', 'member', 'viewer'])
  role?: string;
}