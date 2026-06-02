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
import { MarketplacesService } from './marketplaces.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Marketplaces')
@ApiBearerAuth()
@Controller('marketplaces')
export class MarketplacesController {
  constructor(private readonly marketplacesService: MarketplacesService) {}

  @Get()
  @ApiOperation({ summary: 'List available marketplace integrations' })
  async listMarketplaces() {
    return this.marketplacesService.listMarketplaces();
  }

  @Get('connectors/:code')
  @ApiOperation({ summary: 'Get connector info and required config fields' })
  async getConnectorInfo(@Param('code') code: string) {
    return this.marketplacesService.getConnectorInfo(code);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List user\'s marketplace connections' })
  async listConnectors(@CurrentUser('userId') userId: string) {
    const orgId = 'default-org';
    return this.marketplacesService.listConnectors(orgId);
  }

  @Post('connections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect a marketplace' })
  async connect(@CurrentUser('userId') userId: string, @Body() dto: any) {
    const orgId = dto.organizationId || 'default-org';
    return this.marketplacesService.connectMarketplace(orgId, dto.code, dto.credentials, dto.settings);
  }

  @Patch('connections/:id')
  @ApiOperation({ summary: 'Update connection settings' })
  async updateConnector(@Param('id') id: string, @Body() dto: any) {
    return this.marketplacesService.updateConnector(id, dto);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect a marketplace' })
  async disconnect(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    const orgId = 'default-org';
    return this.marketplacesService.disconnectMarketplace(orgId, id);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List all marketplace listings' })
  async listListings(@CurrentUser('userId') userId: string) {
    const orgId = 'default-org';
    return this.marketplacesService.listListings(orgId);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get listing details with orders and sync logs' })
  async getListing(@Param('id') id: string) {
    return this.marketplacesService.getListing(id);
  }

  @Post('listings/:id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger manual sync for a listing' })
  async syncListing(@Param('id') id: string) {
    return this.marketplacesService.syncListing(id);
  }

  @Get('listings/:id/orders')
  @ApiOperation({ summary: 'List orders for a listing' })
  async listOrders(@Param('id') id: string) {
    return this.marketplacesService.listOrders(id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders (filterable)' })
  async listAllOrders(@CurrentUser('userId') userId: string) {
    const orgId = 'default-org';
    return this.marketplacesService.listAllOrders(orgId);
  }

  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new listing for a product' })
  async createListing(@CurrentUser('userId') userId: string, @Body() dto: any) {
    const orgId = dto.organizationId || 'default-org';
    return this.marketplacesService.createListingForProduct(dto.productId, dto.marketplaceCode, orgId);
  }
}