import { ForbiddenError, subject } from '@casl/ability';
import { accessibleBy } from '@casl/prisma';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Address, Prisma, User } from '@prisma/client';
import { Action, CaslAbilityFactory } from 'src/casl/casl-ability.factory';
import { FilterSearchQueryDto } from 'src/common/dto/filter-search-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/pagination.interface';
import { RequestWithBaseUrl } from 'src/common/interfaces/request-with-base-url.interface';
import { paginate } from 'src/common/utils/paginator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    private prisma: PrismaService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private async getUserWithPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async create(currentUser: User, dto: CreateAddressDto): Promise<Address> {
    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);

    const targetUserId = dto.userId ?? currentUser.id;

    // If creating for another user, require manage/all permission (admin)
    if (targetUserId !== currentUser.id) {
      if (!ability.can(Action.Manage, 'all')) {
        throw new ForbiddenException(
          'Not allowed to create address for other users.',
        );
      }
    }

    const created = await this.prisma.address.create({
      data: { ...dto, userId: targetUserId },
    });
    return created;
  }

  async findAll(
    currentUser: User,
    query: FilterSearchQueryDto,
    req: RequestWithBaseUrl,
  ): Promise<PaginatedResponse<Address>> {
    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);

    const caslWhere: Prisma.AddressWhereInput = accessibleBy(ability).Address;

    const where: Prisma.AddressWhereInput = {
      AND: [caslWhere].filter((c) => c && Object.keys(c).length > 0),
    } as Prisma.AddressWhereInput;

    const result = await paginate<Address>(
      this.prisma.address,
      { where },
      { page: query.page, limit: query.limit, baseUrl: req.baseUrlFull },
    );

    return result;
  }

  async findOne(id: string, currentUser: User): Promise<Address> {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address)
      throw new NotFoundException(`Address with ID "${id}" not found.`);

    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);
    ForbiddenError.from(ability).throwUnlessCan(
      Action.Read,
      subject('Address', address),
    );

    return address;
  }

  async update(
    id: string,
    dto: UpdateAddressDto,
    currentUser: User,
  ): Promise<Address> {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing)
      throw new NotFoundException(`Address with ID "${id}" not found.`);

    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);
    ForbiddenError.from(ability).throwUnlessCan(
      Action.Update,
      subject('Address', existing),
    );

    const updated = await this.prisma.address.update({
      where: { id },
      data: dto as Prisma.AddressUpdateInput,
    });
    return updated;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing)
      throw new NotFoundException(`Address with ID "${id}" not found.`);

    const userWithPermissions = await this.getUserWithPermissions(
      currentUser.id,
    );
    const ability = this.caslAbilityFactory.createForUser(userWithPermissions);
    ForbiddenError.from(ability).throwUnlessCan(
      Action.Delete,
      subject('Address', existing),
    );

    await this.prisma.address.delete({ where: { id } });
  }
}
