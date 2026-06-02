import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpi')
  @ApiOperation({ summary: 'Get KPI snapshots' })
  async getKpi() {
    return this.analyticsService.getKpi();
  }

  @Post('events')
  @ApiOperation({ summary: 'Track an event' })
  async trackEvent(@Body() dto: any) {
    return this.analyticsService.trackEvent(dto);
  }

  @Get('conversions')
  @ApiOperation({ summary: 'Get conversion data' })
  async getConversions() {
    return this.analyticsService.getConversions();
  }
}