import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'admin', enum: ['owner', 'admin', 'member', 'viewer'] })
  @IsString()
  @IsIn(['owner', 'admin', 'member', 'viewer'])
  role: string;
}