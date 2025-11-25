import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
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
  async getMyOrders(
    @Req() req: RequestWithUser,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = this.ensureUser(req);
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;
    return await this.ordersService.getMyOrders(
      user.id,
      status,
      pageNum,
      limitNum,
    );
  }

  @Get('tracking/:trackingNumber')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @ApiOperation({
    summary: 'Tracking status pengiriman berdasarkan nomor resi',
  })
  async trackOrder(@Param('trackingNumber') trackingNumber: string) {
    const tn = (trackingNumber || '').toString().trim();
    if (!tn) {
      throw new BadRequestException('trackingNumber is required');
    }
    return await this.ordersService.trackShipment(tn);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  @ApiOperation({ summary: 'List seluruh order (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  async getAllOrders(@Query() dto: GetOrdersQueryDto) {
    return await this.ordersService.getAllOrdersAdmin({
      page: dto.page ? Number(dto.page) : undefined,
      limit: dto.limit ? Number(dto.limit) : undefined,
      q: dto.q,
      status: dto.status,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    });
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

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  @ApiOperation({ summary: 'Admin: get order detail by id' })
  async getOrderByIdAdmin(@Param('id') id: string) {
    return await this.ordersService.getOrderByIdAdmin(id);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  @ApiOperation({ summary: 'Admin: confirm PAID order to PROCESSING' })
  async confirmOrder(@Param('id') id: string) {
    const order = await this.ordersService.confirmOrderToProcessing(id);
    return { message: 'Order dikonfirmasi dan sedang diproses.', order };
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  @ApiOperation({ summary: 'Admin: mark SHIPPED order as COMPLETED' })
  async completeOrder(@Param('id') id: string) {
    const order = await this.ordersService.completeOrder(id);
    return { message: 'Order ditandai COMPLETED.', order };
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
