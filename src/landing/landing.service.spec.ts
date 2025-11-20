/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { LandingService } from './landing.service';

describe('LandingService', () => {
  let service: LandingService;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<LandingService>(LandingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
