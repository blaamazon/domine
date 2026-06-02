import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';

@ApiTags('Marketing')
@Controller()
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('landing-pages')
  @ApiOperation({ summary: 'List landing pages' })
  async listLandingPages() {
    return this.marketingService.listLandingPages();
  }

  @Post('landing-pages')
  @ApiOperation({ summary: 'Create landing page' })
  async createLandingPage(@Body() dto: any) {
    return this.marketingService.createLandingPage(dto);
  }

  @Get('leads')
  @ApiOperation({ summary: 'List leads' })
  async listLeads() {
    return this.marketingService.listLeads();
  }

  @Get('segments')
  @ApiOperation({ summary: 'List segments' })
  async listSegments() {
    return this.marketingService.listSegments();
  }

  @Post('segments')
  @ApiOperation({ summary: 'Create segment' })
  async createSegment(@Body() dto: any) {
    return this.marketingService.createSegment(dto);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List campaigns' })
  async listCampaigns() {
    return this.marketingService.listCampaigns();
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create campaign' })
  async createCampaign(@Body() dto: any) {
    return this.marketingService.createCampaign(dto);
  }

  @Get('email-templates')
  @ApiOperation({ summary: 'List email templates' })
  async listEmailTemplates() {
    return this.marketingService.listEmailTemplates();
  }

  @Post('email-templates')
  @ApiOperation({ summary: 'Create email template' })
  async createEmailTemplate(@Body() dto: any) {
    return this.marketingService.createEmailTemplate(dto);
  }

  @Get('social-posts')
  @ApiOperation({ summary: 'List social posts' })
  async listSocialPosts() {
    return this.marketingService.listSocialPosts();
  }

  @Post('social-posts')
  @ApiOperation({ summary: 'Create social post' })
  async createSocialPost(@Body() dto: any) {
    return this.marketingService.createSocialPost(dto);
  }

  @Get('purchase-reminders')
  @ApiOperation({ summary: 'List purchase reminders' })
  async listPurchaseReminders() {
    return this.marketingService.listPurchaseReminders();
  }
}