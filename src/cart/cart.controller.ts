import {
  Body,
  Controller,
  Delete,
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
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type ReqWithUser = Request & { user?: { id: string } };

@ApiBearerAuth()
@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Add item to my cart' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Item added/updated successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async addToCart(@Req() req: ReqWithUser, @Body() dto: CreateCartItemDto) {
    const userId = req.user?.id;
    const item = await this.cartService.addToCart(userId, dto);
    return { message: 'Item berhasil dimasukkan ke cart.', item };
  }

  @Get()
  @ApiOperation({ summary: 'Get my cart items' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of cart items' })
  async getMyCart(@Req() req: ReqWithUser) {
    const userId = req.user?.id;
    return await this.cartService.getMyCart(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cart item updated successfully',
  })
  async updateItem(
    @Req() req: ReqWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const userId = req.user?.id;
    const item = await this.cartService.updateItem(userId, id, dto);
    return { message: 'Item cart berhasil diperbarui.', item };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an item from my cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cart item removed successfully',
  })
  async removeItem(@Req() req: ReqWithUser, @Param('id') id: string) {
    const userId = req.user?.id;
    await this.cartService.removeItem(userId, id);
    return { message: 'Item cart berhasil dihapus.' };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear my cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cart cleared successfully',
  })
  async clearMyCart(@Req() req: ReqWithUser) {
    const userId = req.user?.id;
    const count = await this.cartService.clearMyCart(userId);
    return { message: `Berhasil menghapus ${count} item dari cart.` };
  }
}
