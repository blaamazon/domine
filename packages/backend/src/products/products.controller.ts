import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (filterable, paginated)' })
  async list(@Query() query: any) {
    return this.productsService.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  async create(@Body() dto: any) {
    return this.productsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details' })
  async get(@Param('id') id: string) {
    return this.productsService.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete product' })
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish product (triggers marketplace sync)' })
  async publish(@Param('id') id: string) {
    return this.productsService.publish(id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive product' })
  async archive(@Param('id') id: string) {
    return this.productsService.archive(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate product' })
  async duplicate(@Param('id') id: string) {
    return this.productsService.duplicate(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List versions' })
  async listVersions(@Param('id') id: string) {
    return this.productsService.listVersions(id);
  }

  @Get(':id/files')
  @ApiOperation({ summary: 'List files' })
  async listFiles(@Param('id') id: string) {
    return this.productsService.listFiles(id);
  }

  @Post(':id/files')
  @ApiOperation({ summary: 'Upload file' })
  async uploadFile(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.uploadFile(id, dto);
  }
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  @Get()
  @ApiOperation({ summary: 'List categories (tree)' })
  async list() {
    return [];
  }
}

@ApiTags('Bundles')
@Controller('bundles')
export class BundlesController {
  @Get()
  @ApiOperation({ summary: 'List bundles' })
  async list() {
    return [];
  }

  @Post()
  @ApiOperation({ summary: 'Create bundle' })
  async create(@Body() dto: any) {
    return dto;
  }
}