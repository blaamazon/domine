import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SchedulerService } from './scheduler.service';

@ApiTags('Scheduler')
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List scheduled jobs' })
  async listJobs() {
    return this.schedulerService.listJobs();
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create scheduled job' })
  async createJob(@Body() dto: any) {
    return this.schedulerService.createJob(dto);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job details' })
  async getJob(@Param('id') id: string) {
    return this.schedulerService.getJob(id);
  }

  @Get('executions')
  @ApiOperation({ summary: 'List job executions' })
  async listExecutions() {
    return this.schedulerService.listExecutions();
  }

  @Post('jobs/:id/execute')
  @ApiOperation({ summary: 'Trigger manual job execution' })
  async executeJob(@Param('id') id: string) {
    return this.schedulerService.executeJob(id);
  }
}