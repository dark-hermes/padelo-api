import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule conditionally provides the test Prisma service when a test
 * client is present and the TEST_DATABASE_URL environment variable is set.
 * This allows e2e tests to use the generated sqlite test client without
 * changing each test file. If the test client isn't available, it falls
 * back to the normal PrismaService.
 */
const providers = [PrismaService];

if (process.env.TEST_DATABASE_URL) {
  try {
    // Attempt to load the generated test wrapper. If present, use it as the
    // module provider so the rest of the app (and tests) receive the test
    // client when TEST_DATABASE_URL is configured.

    // Allow require here because we need a synchronous, optional load of the
    // generated test wrapper at module-evaluation time. Using dynamic import
    // would be asynchronous and run after the @Module decorator is evaluated.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    const { PrismaTestService } = require('./prisma-test.service');
    if (PrismaTestService) {
      providers[0] = PrismaTestService as unknown as typeof PrismaService;
    }
  } catch {
    // If the test client isn't generated, remain using the default PrismaService.
  }
}

@Global()
@Module({
  providers,
  exports: providers,
})
export class PrismaModule {}
