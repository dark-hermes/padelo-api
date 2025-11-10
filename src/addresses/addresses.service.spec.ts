import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import { CaslModule } from '../casl/casl.module';
import { PrismaService } from '../prisma/prisma.service';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';

describe('AddressesService', () => {
  let service: AddressesService;
  const mockPrismaService = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', roles: [] }) },
    address: {
      create: jest.fn().mockResolvedValue({ id: 'a1' }),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CaslModule],
      providers: [
        AddressesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should call prisma.address.create', async () => {
    const currentUser = {
      id: 'u1',
      email: 'u@example.test',
      name: null,
      password: 'p',
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as User;

    const dto: CreateAddressDto = {
      label: 'L',
      recipient: 'R',
      phone: 'P',
      address: 'A',
      city: 'C',
      province: 'Prov',
      postalCode: '12345',
    } as unknown as CreateAddressDto;

    const result = await service.create(currentUser, dto);
    expect(mockPrismaService.address.create).toHaveBeenCalled();
    expect(result).toEqual({ id: 'a1' });
  });
});
