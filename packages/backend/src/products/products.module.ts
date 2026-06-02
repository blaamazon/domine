import { Module } from '@nestjs/common';
import { ProductsController, CategoriesController, BundlesController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController, CategoriesController, BundlesController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}