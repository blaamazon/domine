import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listJobs() {
    return this.prisma.schedulerJob.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createJob(dto: any) {
    return this.prisma.schedulerJob.create({ data: dto });
  }

  async getJob(id: string) {
    return this.prisma.schedulerJob.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async listExecutions() {
    return this.prisma.jobExecution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async executeJob(id: string) {
    return this.prisma.jobExecution.create({
      data: {
        jobId: id,
        status: 'running',
        startedAt: new Date(),
      },
    });
  }
}