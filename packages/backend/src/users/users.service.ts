import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.authUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        userSettings: true,
        orgMembers: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true, planTier: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Upsert user settings
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
      },
      update: {
        displayName: dto.displayName ?? undefined,
        avatarUrl: dto.avatarUrl ?? undefined,
      },
    });

    return this.getProfile(userId);
  }

  async getSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const updateData: any = {};
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.locale !== undefined) updateData.locale = dto.locale;
    if (dto.theme !== undefined) updateData.theme = dto.theme;
    if (dto.notificationPrefs !== undefined) updateData.notificationPrefs = dto.notificationPrefs;

    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData,
    });

    return this.getSettings(userId);
  }

  async listOrganizations(userId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Check slug uniqueness
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Organization slug "${slug}" is already taken`);
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
    });

    // Create default user settings if not exist
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return org;
  }

  async getOrganization(userId: string, orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        _count: {
          select: { products: true, listings: true, leads: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Verify user is a member
    const membership = org.members.find((m) => m.userId === userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return org;
  }

  async updateOrganization(userId: string, orgId: string, dto: Partial<CreateOrganizationDto>) {
    await this.assertAdminAccess(userId, orgId);

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.slug) {
      const existing = await this.prisma.organization.findFirst({
        where: { slug: dto.slug, id: { not: orgId } },
      });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" is already taken`);
      }
      updateData.slug = dto.slug;
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });
  }

  async listMembers(userId: string, orgId: string) {
    await this.assertMemberAccess(userId, orgId);

    return this.prisma.orgMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userSettings: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(userId: string, orgId: string, dto: InviteMemberDto) {
    await this.assertAdminAccess(userId, orgId);

    // Find user by email
    const invitedUser = await this.prisma.authUser.findUnique({
      where: { email: dto.email },
    });

    if (!invitedUser) {
      // In production, send invitation email and create pending invite
      throw new NotFoundException(`User with email ${dto.email} not found. Invitation email would be sent.`);
    }

    // Check if already a member
    const existingMember = await this.prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: invitedUser.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    return this.prisma.orgMember.create({
      data: {
        organizationId: orgId,
        userId: invitedUser.id,
        role: dto.role || 'member',
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async updateMemberRole(userId: string, orgId: string, memberUserId: string, dto: UpdateMemberRoleDto) {
    await this.assertAdminAccess(userId, orgId);

    const member = await this.prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change the owner's role
    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot change the organization owner\'s role');
    }

    return this.prisma.orgMember.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
      data: { role: dto.role },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async removeMember(userId: string, orgId: string, memberUserId: string) {
    await this.assertAdminAccess(userId, orgId);

    const member = await this.prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    await this.prisma.orgMember.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    return { message: 'Member removed successfully' };
  }

  private async assertMemberAccess(userId: string, orgId: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Access denied');
    }

    return member;
  }

  private async assertAdminAccess(userId: string, orgId: string) {
    const member = await this.assertMemberAccess(userId, orgId);

    if (!['owner', 'admin'].includes(member.role)) {
      throw new ForbiddenException('Admin access required');
    }

    return member;
  }
}