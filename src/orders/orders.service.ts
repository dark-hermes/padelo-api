import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { ShippingOptionsDto } from './dto/shipping-options.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { MidtransService, MidtransTransactionResult } from './midtrans.service';
import { RajaOngkirService, ShippingOption } from './rajaongkir.service';

type CartItemWithVariant = Prisma.CartItemGetPayload<{
  include: { productVariant: { include: { product: true } } };
}>;

type RequestUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

interface CartSummary {
  items: CartItemWithVariant[];
  totalWeight: number; // grams
  totalProductAmount: number; // number representation
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rajaOngkir: RajaOngkirService,
    private readonly midtrans: MidtransService,
    private readonly config: ConfigService,
  ) {}

  async getShippingOptions(
    userId: string,
    dto: ShippingOptionsDto,
  ): Promise<ShippingOption[]> {
    const summary = await this.collectCartSummary(userId, dto.cartItemIds);
    const address = await this.getUserAddress(userId, dto.addressId);

    return await this.rajaOngkir.calculateCost({
      originCity: this.getOriginCity(),
      destinationCity: address.city,
      courier: dto.courier,
      weight: summary.totalWeight,
    });
  }

  async checkout(user: RequestUser, dto: CreateCheckoutDto) {
    const summary = await this.collectCartSummary(user.id, dto.cartItemIds);
    const address = await this.getUserAddress(user.id, dto.addressId);

    const options = await this.rajaOngkir.calculateCost({
      originCity: this.getOriginCity(),
      destinationCity: address.city,
      courier: dto.courier,
      weight: summary.totalWeight,
    });

    const courierService = dto.courierService.trim().toUpperCase();
    const selectedOption = options.find(
      (option) => option.service?.toUpperCase() === courierService,
    );

    if (!selectedOption) {
      throw new BadRequestException('Layanan pengiriman tidak tersedia.');
    }

    const shippingCost = Number(selectedOption.cost) || 0;
    const productAmountDecimal = new Prisma.Decimal(
      summary.totalProductAmount.toFixed(2),
    );
    const shippingCostDecimal = new Prisma.Decimal(shippingCost.toFixed(2));
    const totalAmountDecimal = productAmountDecimal.add(shippingCostDecimal);

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: user.id,
          status: OrderStatus.PENDING,
          totalProductAmount: productAmountDecimal,
          shippingCost: shippingCostDecimal,
          totalAmount: totalAmountDecimal,
          shippingAddress: this.buildAddressSnapshot(address, dto.notes),
          shippingCourier: `${dto.courier.toUpperCase()} ${courierService}`,
          items: {
            create: summary.items.map((item) => ({
              productName:
                item.productVariant.product?.name ?? item.productVariant.name,
              variantName: item.productVariant.name,
              quantity: item.quantity,
              price: item.productVariant.price,
              productVariantId: item.productVariantId,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of summary.items) {
        const updateResult = await tx.productVariant.updateMany({
          where: {
            id: item.productVariantId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (!updateResult.count) {
          throw new BadRequestException(
            `Stok untuk varian ${item.productVariant.name} tidak mencukupi.`,
          );
        }
      }

      await tx.cartItem.deleteMany({
        where: { userId: user.id, id: { in: dto.cartItemIds } },
      });

      return createdOrder;
    });

    const payment = await this.createMidtransTransaction(order.invoiceNumber, {
      grossAmount: Math.round(Number(totalAmountDecimal.toString())),
      customer: {
        name: user.name ?? user.email ?? 'Customer',
        email: user.email ?? undefined,
      },
      items: [
        ...order.items.map((item) => ({
          id: item.productVariantId ?? item.id,
          price: Number(item.price),
          quantity: item.quantity,
          name: `${item.productName} - ${item.variantName}`.slice(0, 50),
        })),
        {
          id: 'SHIPPING',
          price: shippingCost,
          quantity: 1,
          name: `${dto.courier.toUpperCase()} ${courierService}`,
        },
      ],
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentToken: payment.token },
      include: { items: true },
    });

    return { order: updatedOrder, payment };
  }

  async getMyOrders(userId: string) {
    return await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllOrders() {
    return await this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderDetail(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke order ini.');
    }

    return order;
  }

  async cancelOrder(orderId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.userId !== userId) {
        throw new NotFoundException('Order tidak ditemukan.');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Order tidak dapat dibatalkan.');
      }

      for (const item of order.items) {
        if (!item.productVariantId) continue;
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true },
      });
    });
  }

  async updateShipping(orderId: string, dto: UpdateShippingDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order tidak ditemukan.');
    }

    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.PROCESSING &&
      order.status !== OrderStatus.SHIPPED
    ) {
      throw new BadRequestException('Order belum bisa dikirim.');
    }

    return await this.prisma.order.update({
      where: { id: order.id },
      data: {
        shippingCourier: dto.courier,
        shippingResi: dto.trackingNumber,
        status: OrderStatus.SHIPPED,
      },
      include: { items: true },
    });
  }

  async handleMidtransNotification(dto: MidtransNotificationDto) {
    const order = await this.prisma.order.findUnique({
      where: { invoiceNumber: dto.order_id },
    });

    if (!order) {
      this.logger.warn(`Order dengan invoice ${dto.order_id} tidak ditemukan.`);
      return null;
    }

    const { transaction_status: status, fraud_status } = dto;
    let nextStatus: OrderStatus | null = null;
    let paidAt: Date | null = order.paidAt;

    if (['capture', 'settlement'].includes(status)) {
      if (fraud_status === 'challenge') {
        nextStatus = OrderStatus.PROCESSING;
      } else {
        nextStatus = OrderStatus.PAID;
        paidAt = new Date();
      }
    } else if (status === 'pending') {
      nextStatus = OrderStatus.PENDING;
    } else if (['cancel', 'deny', 'expire'].includes(status)) {
      nextStatus = OrderStatus.CANCELLED;
    }

    if (!nextStatus) {
      return order;
    }

    return await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paidAt,
      },
      include: { items: true },
    });
  }

  private async collectCartSummary(
    userId: string,
    cartItemIds: string[],
  ): Promise<CartSummary> {
    const items = await this.prisma.cartItem.findMany({
      where: {
        userId,
        id: { in: cartItemIds },
      },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!items.length) {
      throw new NotFoundException('Cart item tidak ditemukan.');
    }

    if (items.length !== cartItemIds.length) {
      throw new BadRequestException('Beberapa cart item tidak valid.');
    }

    const totalWeight = items.reduce((sum, item) => {
      const weight = Number(item.productVariant.weight ?? 0);
      return sum + Math.max(weight, 0) * 1000 * item.quantity;
    }, 0);

    const totalProductAmount = items.reduce((sum, item) => {
      return sum + Number(item.productVariant.price) * item.quantity;
    }, 0);

    return {
      items,
      totalWeight: Math.max(totalWeight, 1),
      totalProductAmount,
    };
  }

  private async getUserAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Alamat tidak ditemukan.');
    }

    return address;
  }

  private getOriginCity(): string {
    return this.config.get<string>('STORE_ORIGIN_CITY')?.trim() || 'Jakarta';
  }

  private buildAddressSnapshot(address: Address, notes?: string) {
    return {
      id: address.id,
      label: address.label,
      recipient: address.recipient,
      phone: address.phone,
      address: address.address,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      notes: notes ?? null,
    };
  }

  private async createMidtransTransaction(
    orderId: string,
    payload: {
      grossAmount: number;
      customer: { name: string; email?: string };
      items: Array<{
        id: string;
        price: number;
        quantity: number;
        name: string;
      }>;
    },
  ): Promise<MidtransTransactionResult> {
    return await this.midtrans.createTransaction({
      orderId,
      grossAmount: payload.grossAmount,
      customer: payload.customer,
      items: payload.items.map((item) => ({
        ...item,
        price: Math.round(item.price),
      })),
    });
  }
}
