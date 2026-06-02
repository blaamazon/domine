import { Module } from '@nestjs/common';
import { MarketplacesController } from './marketplaces.controller';
import { MarketplacesService } from './marketplaces.service';
import { ConnectorRegistryService } from './connectors/connector-registry.service';
import { AmazonKdpConnector } from './connectors/amazon-kdp.connector';

@Module({
  controllers: [MarketplacesController],
  providers: [
    MarketplacesService,
    ConnectorRegistryService,
    AmazonKdpConnector,
  ],
  exports: [MarketplacesService, ConnectorRegistryService],
})
export class MarketplacesModule {}