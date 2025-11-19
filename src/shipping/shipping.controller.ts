import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { CalculateTariffDto } from './dto/calculate-tariff.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { DestinationSearchDto } from './dto/destination-search.dto';
import { HistoryAwbDto } from './dto/history-awb.dto';
import { PickupRequestDto } from './dto/pickup-request.dto';
import { PrintLabelDto } from './dto/print-label.dto';
import { StoreOrderDto } from './dto/store-order.dto';
import { KomerceWebhookDto } from './dto/webhook.dto';
import { KomerceShippingService } from './komerce-shipping.service';

@ApiTags('Komerce Shipping')
@ApiBearerAuth()
@Controller('shipping/komerce')
export class ShippingController {
  constructor(private readonly komerce: KomerceShippingService) {}

  @Get('destinations')
  @ApiOperation({ summary: 'Search Komerce destination directory' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async searchDestination(@Query() dto: DestinationSearchDto) {
    return await this.komerce.searchDestination(dto);
  }

  @Post('cost')
  @ApiOperation({ summary: 'Calculate shipping cost via Komerce tariff API' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 401 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 500 })
  @HttpCode(200)
  async calculateTariff(@Body() dto: CalculateTariffDto) {
    return await this.komerce.calculateTariff(dto);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Store new order to Komerce' })
  @ApiResponse({ status: 201, description: 'Order synced successfully' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async storeOrder(@Body() dto: StoreOrderDto) {
    return await this.komerce.storeOrder(dto);
  }

  @Patch('orders/cancel')
  @ApiOperation({ summary: 'Cancel Komerce order' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async cancelOrder(@Body() dto: CancelOrderDto) {
    return await this.komerce.cancelOrder(dto);
  }

  @Get('orders/:orderNo')
  @ApiOperation({ summary: 'Get Komerce order detail' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async getOrderDetail(@Param('orderNo') orderNo: string) {
    return await this.komerce.getOrderDetail(orderNo);
  }

  @Get('orders/:orderNo/history')
  @ApiOperation({ summary: 'Get airway bill history for an order' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async getOrderHistory(
    @Param('orderNo') _orderNo: string,
    @Query() dto: HistoryAwbDto,
  ) {
    return await this.komerce.getOrderHistory(dto);
  }

  @Post('pickups')
  @ApiOperation({ summary: 'Request courier pickup for Komerce orders' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async requestPickup(@Body() dto: PickupRequestDto) {
    return await this.komerce.requestPickup(dto);
  }

  @Post('orders/label')
  @ApiOperation({ summary: 'Generate Komerce shipping labels' })
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async printLabel(@Body() dto: PrintLabelDto) {
    return await this.komerce.printLabel(dto);
  }

  @Put('webhook')
  @ApiOperation({ summary: 'Webhook endpoint for Komerce status updates' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  handleWebhook(@Body() dto: KomerceWebhookDto) {
    return this.komerce.handleWebhook(dto);
  }
}
