import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'prisma/prisma-test-client';

@Injectable()
export class PrismaTestService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ log: ['query', 'info', 'warn', 'error'] });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  enableShutdownHooks() {
    process.on('beforeExit', () => {
      void this.$disconnect();
    });
  }
}
