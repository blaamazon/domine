import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductQueryDto) {
    const {
      status,
      type,
      category,
      tag,
      q,
      cursor,
      limit = 20,
      sort = '-created_at',
    } = query;

    const where: any = { deletedAt: null };

    if (status) where.status = status;
    if (type) where.productType = type;
    if (tag) where.tags = { has: tag };
    if (category) {
      where.categories = {
        some: {
          category: { slug: category },
        },
      };
    }

    // Sort direction
    const orderField = sort.startsWith('-') ? sort.substring(1) : sort;
    const orderDir = sort.startsWith('-') ? 'desc' : 'asc';
    const orderBy: any = {};

    if (['created_at', 'title', 'price'].includes(orderField)) {
      const fieldMap: Record<string, string> = {
        created_at: 'createdAt',
        title: 'title',
        price: 'priceCents',
      };
      orderBy[fieldMap[orderField]] = orderDir;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor };
    }

    const items = await this.prisma.product.findMany({
      where,
      take: limit + 1,
      orderBy,
      include: {
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        versions: {
          take: 1,
          orderBy: { versionNumber: 'desc' },
          select: { versionNumber: true },
        },
      },
    });

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return {
      items,
      meta: {
        hasMore,
        nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
        limit,
      },
    };
  }

  async create(orgId: string, dto: CreateProductDto) {
    const slug =
      dto.slug ||
      dto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 500);

    const product = await this.prisma.product.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        slug,
        description: dto.description,
        productType: dto.productType,
        sourceAssetId: dto.sourceAssetId,
        priceCents: dto.priceCents,
        currency: dto.currency || 'USD',
        isPublicDomain: dto.isPublicDomain ?? true,
        originalAuthor: dto.originalAuthor,
        originalYear: dto.originalYear,
        tags: dto.tags || [],
        metadata: dto.metadata || {},
        categories: dto.categoryIds?.length
          ? {
              create: dto.categoryIds.map((id) => ({
                category: { connect: { id } },
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    return product;
  }

  async get(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { files: true },
        },
        files: true,
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
        listings: {
          include: {
            marketplace: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const updateData: any = { ...dto };
    delete updateData.categoryIds;

    // Handle category updates
    if (dto.categoryIds) {
      // Remove existing categories and re-add
      await this.prisma.productCategory.deleteMany({ where: { productId: id } });
      if (dto.categoryIds.length > 0) {
        await this.prisma.productCategory.createMany({
          data: dto.categoryIds.map((catId) => ({
            productId: id,
            categoryId: catId,
          })),
        });
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        categories: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Product deleted successfully' };
  }

  async publish(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    // Create a new version snapshot
    const latestVersion = await this.prisma.productVersion.findFirst({
      where: { productId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const nextVersion = (latestVersion?.versionNumber || 0) + 1;

    await this.prisma.productVersion.create({
      data: {
        productId: id,
        versionNumber: nextVersion,
        changesSummary: 'Published',
        fileManifest: {},
      },
    });

    return this.prisma.product.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  async archive(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async duplicate(id: string, orgId: string) {
    const original = await this.prisma.product.findUnique({ where: { id } });
    if (!original || original.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.create({
      data: {
        organizationId: orgId || original.organizationId,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now()}`.substring(0, 500),
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
    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) throw new NotFoundException('Product not found');

    return this.prisma.productVersion.findMany({
      where: { productId },
      include: { files: true, createdByUser: { select: { id: true, email: true } } },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async listFiles(productId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) throw new NotFoundException('Product not found');

    return this.prisma.productFile.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadFile(productId: string, dto: UploadFileDto) {
    const existing = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!existing) throw new NotFoundException('Product not found');

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

  // Categories
  async listCategories() {
    const categories = await this.prisma.category.findMany({
      include: {
        children: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Build tree structure
    const topLevel = categories.filter((c) => !c.parentId);
    return topLevel.map((cat) => ({
      ...cat,
      children: categories.filter((c) => c.parentId === cat.id),
    }));
  }

  // Bundles
  async listBundles(orgId: string) {
    return this.prisma.bundle.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, priceCents: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async createBundle(orgId: string, dto: CreateBundleDto) {
    const bundle = await this.prisma.bundle.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        description: dto.description,
        bundleType: dto.bundleType,
        priceCents: dto.priceCents,
        discountCents: dto.discountCents,
        items: {
          create: dto.productIds.map((productId, idx) => ({
            productId,
            sortOrder: idx,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true, priceCents: true },
            },
          },
        },
      },
    });

    return bundle;
  }
}