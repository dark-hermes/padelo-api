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
import { KomerceShippingService } from 'src/shipping/komerce-shipping.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { ShippingOptionsDto } from './dto/shipping-options.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { MidtransService, MidtransTransactionResult } from './midtrans.service';

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

interface KomerceCalculateResult {
  shipping_name: string;
  service_name: string;
  weight: number;
  is_cod: boolean;
  shipping_cost: number;
  shipping_cost_net?: number;
  etd?: string;
}

interface KomerceCalculateResponse {
  data?: {
    calculate_reguler?: KomerceCalculateResult[];
    calculate_cargo?: KomerceCalculateResult[];
    calculate_instant?: KomerceCalculateResult[];
  };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly komerce: KomerceShippingService,
    private readonly midtrans: MidtransService,
    private readonly config: ConfigService,
  ) {}

  async getShippingOptions(userId: string, dto: ShippingOptionsDto) {
    const summary = await this.collectCartSummary(userId, dto.cartItemIds);
    const address = await this.getUserAddress(userId, dto.addressId);

    this.logger.debug(
      `getShippingOptions: user=${userId} cartItemIds=${dto.cartItemIds.join(',')} items=${summary.items.length} addressFound=${!!address}`,
    );

    const receiverDestinationId =
      await this.resolveReceiverDestinationId(address);

    const weightKg = Math.max(summary.totalWeight / 1000, 0.001);
    const itemValue = Math.round(summary.totalProductAmount);

    const calc = await this.komerce.calculateTariff({
      shipperDestinationId: 8161, // constant as specified
      receiverDestinationId,
      weight: weightKg,
      itemValue,
      cod: true,
      originPinPoint: address.komercePinPoint ?? undefined,
      destinationPinPoint: address.komercePinPoint ?? undefined,
    });

    const reguler: KomerceCalculateResult[] =
      (calc as KomerceCalculateResponse).data?.calculate_reguler ?? [];
    const cargo: KomerceCalculateResult[] =
      (calc as KomerceCalculateResponse).data?.calculate_cargo ?? [];
    const instant: KomerceCalculateResult[] =
      (calc as KomerceCalculateResponse).data?.calculate_instant ?? [];

    const mapOption = (o: KomerceCalculateResult) => {
      const base = Number(o.shipping_cost_net ?? o.shipping_cost ?? 0);
      const costOriginal = base;
      const min = costOriginal + 1000;
      const max = costOriginal + 2000;
      return {
        shippingName: o.shipping_name,
        serviceName: o.service_name,
        weight: o.weight,
        isCod: o.is_cod,
        shippingCostOriginal: costOriginal,
        shippingCostEstimatedMin: min,
        shippingCostEstimatedMax: max,
        etd: o.etd ?? null,
      };
    };

    return {
      reguler: reguler.map(mapOption),
      cargo: cargo.map(mapOption),
      instant: instant.map(mapOption),
    };
  }

  async checkout(user: RequestUser, dto: CreateCheckoutDto) {
    const summary = await this.collectCartSummary(user.id, dto.cartItemIds);
    const address = await this.getUserAddress(user.id, dto.addressId);

    const receiverDestinationId =
      await this.resolveReceiverDestinationId(address);
    const weightKg = Math.max(summary.totalWeight / 1000, 0.001);
    const itemValue = Math.round(summary.totalProductAmount);
    const calc = await this.komerce.calculateTariff({
      shipperDestinationId: 8161,
      receiverDestinationId,
      weight: weightKg,
      itemValue,
      cod: true,
      originPinPoint: address.komercePinPoint ?? undefined,
      destinationPinPoint: address.komercePinPoint ?? undefined,
    });
    const allReguler: KomerceCalculateResult[] =
      (calc as KomerceCalculateResponse).data?.calculate_reguler ?? [];
    const targetName = dto.courier.trim().toUpperCase();
    const targetService = dto.courierService.trim().toUpperCase();
    const selected = allReguler.find(
      (o) =>
        String(o.shipping_name).toUpperCase() === targetName &&
        String(o.service_name).toUpperCase() === targetService,
    );
    if (!selected) {
      throw new BadRequestException('Layanan pengiriman tidak tersedia.');
    }
    const shippingCostOriginal = Number(
      selected.shipping_cost_net ?? selected.shipping_cost ?? 0,
    );
    const shippingCostEstimatedMin = shippingCostOriginal + 1000;
    const shippingCostEstimatedMax = shippingCostOriginal + 2000;
    const shippingCost = shippingCostOriginal;
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
          shippingCourier: `${targetName} ${targetService}`,
          shippingName: targetName,
          shippingServiceName: targetService,
          shippingCostOriginal: shippingCostOriginal,
          shippingCostEstimatedMin: shippingCostEstimatedMin,
          shippingCostEstimatedMax: shippingCostEstimatedMax,
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
          name: `${targetName} ${targetService}`,
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

  private async resolveReceiverDestinationId(address: Address) {
    if (address.komerceDestinationId) return address.komerceDestinationId;
    const postal = address.postalCode.trim();
    const search = (await this.komerce.searchDestination({
      keyword: postal,
    })) as {
      data?: Array<{ id: number | string; zip_code?: string | number }>;
    };
    const destinations = search.data ?? [];
    const match = destinations.find(
      (d) => String(d.zip_code).trim() === postal,
    );
    if (!match) {
      throw new NotFoundException('Destinasi pengiriman tidak ditemukan.');
    }
    const destinationId = Number(match.id);
    await this.prisma.address.update({
      where: { id: address.id },
      data: { komerceDestinationId: destinationId },
    });
    return destinationId;
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
