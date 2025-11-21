import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartItem, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async addToCart(userId: string, dto: CreateCartItemDto): Promise<CartItem> {
    const qty = dto.quantity ?? 1;
    if (qty < 1) throw new BadRequestException('Quantity must be at least 1');

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.productVariantId },
    });
    if (!variant) throw new NotFoundException('Product variant not found');

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        userId_productVariantId: {
          userId,
          productVariantId: dto.productVariantId,
        },
      },
    });

    if (existing) {
      return await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + qty },
        include: {
          productVariant: {
            include: {
              product: true,
              images: true,
            },
          },
        },
      });
    }

    return await this.prisma.cartItem.create({
      data: {
        userId,
        productVariantId: dto.productVariantId,
        quantity: qty,
      },
      include: {
        productVariant: {
          include: {
            product: true,
            images: true,
          },
        },
      },
    });
  }

  async getMyCart(userId: string): Promise<CartItem[]> {
    return await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        productVariant: {
          include: {
            product: true,
            images: true,
          },
        },
      },
    });
  }

  async updateItem(
    userId: string,
    id: string,
    dto: UpdateCartItemDto,
  ): Promise<CartItem> {
    const item = await this.prisma.cartItem.findUnique({ where: { id } });
    if (!item || item.userId !== userId)
      throw new NotFoundException('Cart item not found');

    const data: Prisma.CartItemUpdateInput = {
      quantity: dto.quantity,
    } as Prisma.CartItemUpdateInput;
    return await this.prisma.cartItem.update({
      where: { id },
      data,
      include: {
        productVariant: {
          include: {
            product: true,
            images: true,
          },
        },
      },
    });
  }

  async removeItem(userId: string, id: string): Promise<void> {
    const item = await this.prisma.cartItem.findUnique({ where: { id } });
    if (!item || item.userId !== userId)
      throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id } });
  }

  async clearMyCart(userId: string): Promise<number> {
    const res = await this.prisma.cartItem.deleteMany({ where: { userId } });
    return res.count;
  }
}
