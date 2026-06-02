import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { DiscoverDto } from './dto/discover.dto';

@ApiTags('Content Pipeline')
@ApiBearerAuth()
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('connectors')
  @ApiOperation({ summary: 'List available content source connectors' })
  async listConnectors() {
    return this.contentService.listConnectors();
  }

  @Post('discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger content discovery from a source' })
  async discover(@Body() dto: DiscoverDto) {
    const orgId = dto.organizationId || 'default-org';
    return this.contentService.triggerDiscovery(dto.source, dto.query, orgId);
  }

  @Get('sources')
  @ApiOperation({ summary: 'List discovered source assets' })
  async listSources() {
    return this.contentService.listSources();
  }

  @Get('sources/:id')
  @ApiOperation({ summary: 'Get source asset details with processed docs' })
  async getSource(@Param('id') id: string) {
    return this.contentService.getSource(id);
  }

  @Post('sources/:id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger processing pipeline for an asset' })
  async processAsset(@Param('id') id: string) {
    return this.contentService.processAsset(id);
  }

  @Get('connectors/:source/search')
  @ApiOperation({ summary: 'Search a content source directly' })
  async searchSource(
    @Param('source') source: string,
    @Query('q') query: string,
  ) {
    return this.contentService.searchSource(source, query);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List templates' })
  async listTemplates() {
    return this.contentService.listTemplates();
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create template' })
  async createTemplate(@Body() dto: any) {
    return this.contentService.createTemplate(dto);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  async getTemplate(@Param('id') id: string) {
    return this.contentService.getTemplate(id);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update template' })
  async updateTemplate(@Param('id') id: string, @Body() dto: any) {
    return this.contentService.updateTemplate(id, dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List enrichment/processing jobs' })
  async listJobs() {
    return this.contentService.listJobs();
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job status and details' })
  async getJob(@Param('id') id: string) {
    return this.contentService.getJob(id);
  }
}