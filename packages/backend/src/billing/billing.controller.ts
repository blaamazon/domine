import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get subscription details' })
  async getSubscription() {
    return this.billingService.getSubscription();
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create/update subscription' })
  async updateSubscription(@Body() dto: any) {
    return this.billingService.updateSubscription(dto);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  async listInvoices() {
    return this.billingService.listInvoices();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage records' })
  async getUsage() {
    return this.billingService.getUsage();
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(@Body() body: any) {
    return this.billingService.handleWebhook(body);
  }
}