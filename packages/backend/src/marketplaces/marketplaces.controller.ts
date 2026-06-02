import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketplacesService } from './marketplaces.service';

@ApiTags('Marketplaces')
@Controller()
export class MarketplacesController {
  constructor(private readonly marketplacesService: MarketplacesService) {}

  @Get('marketplaces')
  @ApiOperation({ summary: 'List available marketplaces' })
  async listMarketplaces() {
    return this.marketplacesService.listMarketplaces();
  }

  @Get('connectors')
  @ApiOperation({ summary: 'List connector configs' })
  async listConnectors() {
    return this.marketplacesService.listConnectors();
  }

  @Post('connectors')
  @ApiOperation({ summary: 'Create connector config' })
  async createConnector(@Body() dto: any) {
    return this.marketplacesService.createConnector(dto);
  }

  @Patch('connectors/:id')
  @ApiOperation({ summary: 'Update connector config' })
  async updateConnector(@Param('id') id: string, @Body() dto: any) {
    return this.marketplacesService.updateConnector(id, dto);
  }

  @Delete('connectors/:id')
  @ApiOperation({ summary: 'Delete connector config' })
  async deleteConnector(@Param('id') id: string) {
    return this.marketplacesService.deleteConnector(id);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List marketplace listings' })
  async listListings() {
    return this.marketplacesService.listListings();
  }

  @Post('listings/:id/sync')
  @ApiOperation({ summary: 'Sync listing with marketplace' })
  async syncListing(@Param('id') id: string) {
    return this.marketplacesService.syncListing(id);
  }
}