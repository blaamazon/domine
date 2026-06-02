import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listLandingPages() {
    return this.prisma.landingPage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createLandingPage(dto: any) {
    return this.prisma.landingPage.create({ data: dto });
  }

  async listLeads() {
    return this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async listSegments() {
    return this.prisma.segment.findMany({
      include: { rules: true },
    });
  }

  async createSegment(dto: any) {
    return this.prisma.segment.create({ data: dto });
  }

  async listCampaigns() {
    return this.prisma.campaign.findMany({
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCampaign(dto: any) {
    return this.prisma.campaign.create({ data: dto });
  }

  async listEmailTemplates() {
    return this.prisma.emailTemplate.findMany();
  }

  async createEmailTemplate(dto: any) {
    return this.prisma.emailTemplate.create({ data: dto });
  }

  async listSocialPosts() {
    return this.prisma.socialPost.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createSocialPost(dto: any) {
    return this.prisma.socialPost.create({ data: dto });
  }

  async listPurchaseReminders() {
    return this.prisma.purchaseReminder.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}