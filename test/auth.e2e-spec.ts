// test/auth.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = app.get<PrismaService>(PrismaService);

    // Ensure maintenance mode is disabled for tests
    await prisma.setting.upsert({
      where: { key: 'maintenanceMode' },
      update: { value: 'false' },
      create: {
        key: 'maintenanceMode',
        value: 'false',
        label: 'Maintenance Mode',
      },
    });

    // Clean any existing refresh tokens to avoid unique constraint collisions
    await prisma.refreshToken.deleteMany({});

    await app.init();
  });

  it('/auth/login (POST)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
      })
      .expect(200)
      .expect((res: request.Response) => {
        // Check that user object is returned
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(res.body.email).toBe(process.env.DEFAULT_ADMIN_EMAIL);

        // Check that cookies are set
        const cookies = (res.headers['set-cookie'] ??
          []) as unknown as string[];
        // strip attributes for consistency with other e2e tests
        const simpleCookies = cookies.map((c) => c.split(';')[0]);
        expect(simpleCookies).toBeDefined();
        expect(simpleCookies.some((c) => c.startsWith('access_token='))).toBe(
          true,
        );
        expect(simpleCookies.some((c) => c.startsWith('refresh_token='))).toBe(
          true,
        );
      });
  });

  it('/auth/login (POST) - should work even when maintenance mode is active', async () => {
    // Clean up any existing refresh tokens from previous test
    await prisma.refreshToken.deleteMany({});

    // Enable maintenance mode
    await prisma.setting.upsert({
      where: { key: 'maintenanceMode' },
      update: { value: 'true' },
      create: {
        key: 'maintenanceMode',
        value: 'true',
        label: 'Maintenance Mode',
      },
    });

    // Login should still work even in maintenance mode
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
      })
      .expect(200)
      .expect((res: request.Response) => {
        // Check that user object is returned
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(res.body.email).toBe(process.env.DEFAULT_ADMIN_EMAIL);

        // Check that cookies are set
        const cookies = (res.headers['set-cookie'] ??
          []) as unknown as string[];
        expect(cookies).toBeDefined();
        expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
        expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
      });
  });
});
