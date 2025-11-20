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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Address, User } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CheckAbilities } from 'src/casl/abilities.decorator';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { Action } from 'src/casl/casl-ability.factory';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { AddressesService } from './addresses.service';
import { AddressResponseDto } from './dto/address-response.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

interface RequestWithUser extends RequestWithBaseUrl {
  user: User;
}

@ApiBearerAuth()
@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard, AbilitiesGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an address for current user' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AddressResponseDto })
  @CheckAbilities({ action: Action.Create, subject: 'Address' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: { user: User },
    @Body() createDto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    const address = await this.addressesService.create(req.user, createDto);
    return { message: 'Alamat berhasil dibuat.', address };
  }

  @Get()
  @ApiOperation({ summary: 'List addresses' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of addresses' })
  @CheckAbilities({ action: Action.Read, subject: 'Address' })
  findAll(
    @Req() req: RequestWithUser,
    @Query() query: FilterSearchQueryDto,
  ): Promise<PaginatedResponse<Address>> {
    return this.addressesService.findAll(req.user, query, req);
  }

  @Get('me')
  @ApiOperation({ summary: 'List addresses for current authenticated user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of addresses for current user',
  })
  listForCurrent(
    @Req() req: RequestWithUser,
    @Query() query: FilterSearchQueryDto,
  ) {
    return this.addressesService.findForCurrentUser(req.user, query, req);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List addresses for a given user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of addresses for given user',
  })
  @CheckAbilities({ action: Action.Read, subject: 'Address' })
  listByUserId(
    @Param('userId') userId: string,
    @Req() req: RequestWithUser,
    @Query() query: FilterSearchQueryDto,
  ) {
    return this.addressesService.findByUserId(userId, req.user, query, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckAbilities({ action: Action.Read, subject: 'Address' })
  findOne(
    @Param('id') id: string,
    @Req() req: { user: User },
  ): Promise<Address> {
    return this.addressesService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiResponse({ status: HttpStatus.OK, type: AddressResponseDto })
  @CheckAbilities({ action: Action.Update, subject: 'Address' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAddressDto,
    @Req() req: { user: User },
  ): Promise<AddressResponseDto> {
    const updated = await this.addressesService.update(id, updateDto, req.user);
    return { message: 'Alamat berhasil diperbarui.', address: updated };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({ status: HttpStatus.OK })
  @CheckAbilities({ action: Action.Delete, subject: 'Address' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Req() req: { user: User }) {
    await this.addressesService.remove(id, req.user);
    return { message: 'Alamat berhasil dihapus.' };
  }
}
