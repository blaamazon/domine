import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service';

@ApiTags('Content Pipeline')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('sources')
  @ApiOperation({ summary: 'List source assets' })
  async listSources() {
    return this.contentService.listSources();
  }

  @Post('sources')
  @ApiOperation({ summary: 'Register a source asset' })
  async registerSource(@Body() dto: any) {
    return this.contentService.registerSource(dto);
  }

  @Get('sources/:id')
  @ApiOperation({ summary: 'Get source asset details' })
  async getSource(@Param('id') id: string) {
    return this.contentService.getSource(id);
  }

  @Post('sources/:id/process')
  @ApiOperation({ summary: 'Trigger processing of a source asset' })
  async processSource(@Param('id') id: string) {
    return this.contentService.processSource(id);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List templates' })
  async listTemplates() {
    return this.contentService.listTemplates();
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create template' })
  async createTemplate(@Body() dto: any) {
    return this.contentService.createTemplate(dto);
  }

  @Get('enrichment-jobs')
  @ApiOperation({ summary: 'List enrichment jobs' })
  async listJobs() {
    return this.contentService.listJobs();
  }
}