import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(query: any) {
    const { status, type, category, tag, page = '1', limit = '20' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (type) where.productType = type;
    if (tag) where.tags = { has: tag };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { categories: { include: { category: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page: parseInt(page), limit: parseInt(limit) };
  }

  async create(dto: any) {
    return this.prisma.product.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title,
        slug: dto.slug || dto.title.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description,
        productType: dto.productType,
        priceCents: dto.priceCents,
        currency: dto.currency || 'USD',
        isPublicDomain: dto.isPublicDomain ?? true,
        originalAuthor: dto.originalAuthor,
        originalYear: dto.originalYear,
        tags: dto.tags || [],
        metadata: dto.metadata || {},
      },
    });
  }

  async get(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        versions: true,
        files: true,
        categories: { include: { category: true } },
        listings: true,
      },
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async publish(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  }

  async archive(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async duplicate(id: string) {
    const original = await this.prisma.product.findUnique({ where: { id } });
    if (!original) throw new Error('Product not found');

    return this.prisma.product.create({
      data: {
        organizationId: original.organizationId,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy`,
        description: original.description,
        productType: original.productType,
        priceCents: original.priceCents,
        currency: original.currency,
        isPublicDomain: original.isPublicDomain,
        originalAuthor: original.originalAuthor,
        originalYear: original.originalYear,
        tags: original.tags,
        metadata: original.metadata,
        status: 'draft',
      },
    });
  }

  async listVersions(productId: string) {
    return this.prisma.productVersion.findMany({
      where: { productId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async listFiles(productId: string) {
    return this.prisma.productFile.findMany({
      where: { productId },
    });
  }

  async uploadFile(productId: string, dto: any) {
    return this.prisma.productFile.create({
      data: {
        productId,
        fileType: dto.fileType,
        fileUrl: dto.fileUrl,
        fileSizeBytes: dto.fileSizeBytes ? BigInt(dto.fileSizeBytes) : null,
        checksumSha256: dto.checksumSha256,
        isPreview: dto.isPreview || false,
      },
    });
  }
}