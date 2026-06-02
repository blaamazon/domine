import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UploadFileDto } from './dto/upload-file.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateBundleDto } from './dto/create-bundle.dto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (filterable, paginated)' })
  async list(@Query() query: ProductQueryDto) {
    return this.productsService.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create product' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    // In a real app, resolve orgId from user's active org
    const orgId = dto['organizationId'] || 'default-org';
    return this.productsService.create(orgId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details' })
  async get(@Param('id') id: string) {
    return this.productsService.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete product' })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish product (creates version snapshot)' })
  async publish(@Param('id') id: string) {
    return this.productsService.publish(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive product' })
  async archive(@Param('id') id: string) {
    return this.productsService.archive(id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate product as draft' })
  async duplicate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const orgId = 'default-org';
    return this.productsService.duplicate(id, orgId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List product versions' })
  async listVersions(@Param('id') id: string) {
    return this.productsService.listVersions(id);
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'List product files' })
  async listFiles(@Param('id') id: string) {
    return this.productsService.listFiles(id);
  }

  @Post(':id/files')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload file to product' })
  async uploadFile(@Param('id') id: string, @Body() dto: UploadFileDto) {
    return this.productsService.uploadFile(id, dto);
  }
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List categories (tree)' })
  async list() {
    return this.productsService.listCategories();
  }
}

@ApiTags('Bundles')
@Controller('bundles')
export class BundlesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List bundles' })
  async list(@CurrentUser('userId') userId: string) {
    const orgId = 'default-org';
    return this.productsService.listBundles(orgId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create bundle' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBundleDto,
  ) {
    const orgId = 'default-org';
    return this.productsService.createBundle(orgId, dto);
  }
}