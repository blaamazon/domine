import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { ContentModule } from './content/content.module';
import { MarketplacesModule } from './marketplaces/marketplaces.module';
import { MarketingModule } from './marketing/marketing.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BillingModule } from './billing/billing.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    ContentModule,
    MarketplacesModule,
    MarketingModule,
    AnalyticsModule,
    BillingModule,
    SchedulerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}