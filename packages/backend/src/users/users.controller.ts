import { Controller, Get, Patch, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile() {
    return this.usersService.getProfile();
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(@Body() dto: any) {
    return this.usersService.updateProfile(dto);
  }

  @Get('users/me/settings')
  @ApiOperation({ summary: 'Get user settings' })
  async getSettings() {
    return this.usersService.getSettings();
  }

  @Patch('users/me/settings')
  @ApiOperation({ summary: 'Update user settings' })
  async updateSettings(@Body() dto: any) {
    return this.usersService.updateSettings(dto);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations for user' })
  async listOrganizations() {
    return this.usersService.listOrganizations();
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Create organization' })
  async createOrganization(@Body() dto: any) {
    return this.usersService.createOrganization(dto);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization details' })
  async getOrganization(@Param('id') id: string) {
    return this.usersService.getOrganization(id);
  }

  @Patch('organizations/:id')
  @ApiOperation({ summary: 'Update organization' })
  async updateOrganization(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateOrganization(id, dto);
  }

  @Get('organizations/:id/members')
  @ApiOperation({ summary: 'List organization members' })
  async listMembers(@Param('id') id: string) {
    return this.usersService.listMembers(id);
  }

  @Post('organizations/:id/members')
  @ApiOperation({ summary: 'Invite member' })
  async inviteMember(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.inviteMember(id, dto);
  }

  @Patch('organizations/:id/members/:userId')
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: any,
  ) {
    return this.usersService.updateMemberRole(id, userId, dto);
  }

  @Delete('organizations/:id/members/:userId')
  @ApiOperation({ summary: 'Remove member' })
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.usersService.removeMember(id, userId);
  }
}