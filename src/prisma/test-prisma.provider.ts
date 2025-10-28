/**
 * Factory that returns the test Prisma provider (wrapper around the generated test client).
 * If the wrapper or generated client is missing, this will throw a clear error
 * instructing the developer to run the generation script. Tests using this helper
 * will fail-fast rather than silently falling back.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Provider } from '@nestjs/common';

/**
 * Factory function that returns the test Prisma provider class (PrismaTestService)
 * if the generated client and wrapper exist. Otherwise it throws a helpful error
 * explaining how to generate the test client. This keeps tests fail-fast.
 */
export function testPrismaFactory(): unknown {
  // Attempt to load the test wrapper. This helper is used in test environments
  // where the generated test client and a small wrapper `prisma-test.service`
  // exist. If not present, we throw a helpful error message.
  try {
    // The use of `require` here is intentional: the generated test client may
    // not exist in regular development environments and we want to fail-fast
    // during test setup with a clear message. Suppress the lint rule for this
    // specific case.
    const wrapper: unknown = require('./prisma-test.service');

    if (
      wrapper &&
      typeof wrapper === 'object' &&
      'PrismaTestService' in (wrapper as Record<string, unknown>)
    ) {
      return (wrapper as Record<string, unknown>)['PrismaTestService'];
    }

    throw new Error(
      'PrismaTestService wrapper not found in src/prisma/prisma-test.service',
    );
  } catch {
    // No need to expose the caught error; provide a clear guidance message.
    throw new Error(
      'Prisma test client not found. Run `npm run prisma:generate:test` (or `npx prisma generate --schema=prisma/schema.test.prisma`) to generate the test client before running e2e tests.',
    );
  }
}

/**
 * A Nest provider you can add to your test module's providers array. Use it like:
 * providers: [TestPrismaProvider]
 * Then retrieve the PrismaService via moduleRef.get(PrismaService)
 */
export const TestPrismaProvider: Provider = {
  provide: 'TestPrismaProvider',
  useFactory: () => testPrismaFactory(),
};

export default TestPrismaProvider;
