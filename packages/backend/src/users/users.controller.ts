import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('users/me/settings')
  @ApiOperation({ summary: 'Get user settings' })
  async getSettings(@CurrentUser('userId') userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Patch('users/me/settings')
  @ApiOperation({ summary: 'Update user settings' })
  async updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, dto);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations for current user' })
  async listOrganizations(@CurrentUser('userId') userId: string) {
    return this.usersService.listOrganizations(userId);
  }

  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create organization' })
  async createOrganization(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.usersService.createOrganization(userId, dto);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization details' })
  async getOrganization(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.getOrganization(userId, id);
  }

  @Patch('organizations/:id')
  @ApiOperation({ summary: 'Update organization' })
  async updateOrganization(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateOrganizationDto>,
  ) {
    return this.usersService.updateOrganization(userId, id, dto);
  }

  @Get('organizations/:id/members')
  @ApiOperation({ summary: 'List organization members' })
  async listMembers(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.listMembers(userId, id);
  }

  @Post('organizations/:id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite member to organization' })
  async inviteMember(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.usersService.inviteMember(userId, id, dto);
  }

  @Patch('organizations/:id/members/:memberUserId')
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.usersService.updateMemberRole(userId, id, memberUserId, dto);
  }

  @Delete('organizations/:id/members/:memberUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  async removeMember(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.usersService.removeMember(userId, id, memberUserId);
  }
}