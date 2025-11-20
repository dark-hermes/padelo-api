/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { AbilitiesGuard } from 'src/casl/abilities.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

describe('LandingController', () => {
  let controller: LandingController;

  beforeEach(async () => {
    const prismaMock: Partial<PrismaService> = {
      landing: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any,
    };
    const moduleBuilder = Test.createTestingModule({
      controllers: [LandingController],
      providers: [
        LandingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    })
      .overrideGuard(AbilitiesGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<LandingController>(LandingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
