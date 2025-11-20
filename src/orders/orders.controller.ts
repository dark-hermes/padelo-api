import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { ShippingOptionsDto } from './dto/shipping-options.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { OrdersService } from './orders.service';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
}

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('shipping-options')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'Hitung opsi ongkir untuk cart terpilih' })
  @ApiResponse({ status: HttpStatus.OK })
  async getShippingOptions(
    @Req() req: RequestWithUser,
    @Body() dto: ShippingOptionsDto,
  ) {
    const user = this.ensureUser(req);
    const options = await this.ordersService.getShippingOptions(user.id, dto);
    // Return the arrays directly (reguler, cargo, instant) for simpler client consumption
    return options;
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'Create checkout dan order baru' })
  @ApiResponse({ status: HttpStatus.CREATED })
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Req() req: RequestWithUser, @Body() dto: CreateCheckoutDto) {
    const user = this.ensureUser(req);
    const result = await this.ordersService.checkout(user, dto);
    return { message: 'Checkout berhasil dibuat.', ...result };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'List order milik user saat ini' })
  async getMyOrders(@Req() req: RequestWithUser) {
    const user = this.ensureUser(req);
    return await this.ordersService.getMyOrders(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  @ApiOperation({ summary: 'List seluruh order (admin)' })
  async getAllOrders() {
    return await this.ordersService.getAllOrders();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'Detail order milik user' })
  async getOrderDetail(@Req() req: RequestWithUser, @Param('id') id: string) {
    const user = this.ensureUser(req);
    return await this.ordersService.getOrderDetail(id, user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({ summary: 'Batalkan order (selama masih pending)' })
  async cancelOrder(@Req() req: RequestWithUser, @Param('id') id: string) {
    const user = this.ensureUser(req);
    const order = await this.ordersService.cancelOrder(id, user.id);
    return { message: 'Order berhasil dibatalkan.', order };
  }

  @Patch(':id/shipping')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  @ApiOperation({ summary: 'Update informasi pengiriman (admin)' })
  async updateShipping(
    @Param('id') id: string,
    @Body() dto: UpdateShippingDto,
  ) {
    const order = await this.ordersService.updateShipping(id, dto);
    return { message: 'Informasi pengiriman diperbarui.', order };
  }

  @Post('midtrans/notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Midtrans' })
  async handleMidtransWebhook(@Body() dto: MidtransNotificationDto) {
    const order = await this.ordersService.handleMidtransNotification(dto);
    return { message: 'Webhook processed', order };
  }

  private ensureUser(req: RequestWithUser) {
    if (!req.user) {
      throw new ForbiddenException('User context is missing');
    }
    return req.user;
  }
}
