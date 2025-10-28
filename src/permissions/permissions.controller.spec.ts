import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { CaslAbilityFactory } from 'src/casl/casl-ability.factory';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

describe('PermissionsController', () => {
  let controller: PermissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: PermissionsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: {
            createForUser: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            permission: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
