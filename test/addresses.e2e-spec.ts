import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Addresses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let accessToken: string;
  let addressId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = app.get<PrismaService>(PrismaService);

    await prisma.setting.upsert({
      where: { key: 'maintenanceMode' },
      update: { value: 'false' },
      create: {
        key: 'maintenanceMode',
        value: 'false',
        label: 'Maintenance Mode',
      },
    });

    await prisma.refreshToken.deleteMany({});

    await app.init();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
      })
      .expect(200);
    const cookies = (loginResponse.headers['set-cookie'] ??
      []) as unknown as string[];
    const access = cookies.find((c) => c.startsWith('access_token='));
    if (access) accessToken = access.split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create an address for current user', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .post('/addresses')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({
        label: 'Home',
        recipient: 'Tester',
        phone: '0812',
        address: 'Jl Test',
        city: 'City',
        province: 'Prov',
        postalCode: '12345',
      })
      .expect(201);

    const body = res.body as unknown as { address: { id: string } };
    expect(body).toHaveProperty('address');
    addressId = body.address.id;
  });

  it('should list addresses for user', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .get('/addresses')
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);

    const listBody = res.body as unknown as { data: unknown[] };
    expect(listBody).toHaveProperty('data');
    expect(Array.isArray(listBody.data)).toBe(true);
  });

  it('should update the address', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .patch(`/addresses/${addressId}`)
      .set('Cookie', [`access_token=${accessToken}`])
      .send({ label: 'Office' })
      .expect(200);

    const updBody = res.body as unknown as { address: { label: string } };
    expect(updBody).toHaveProperty('address');
    expect(updBody.address.label).toBe('Office');
  });

  it('should delete the address', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer())
      .delete(`/addresses/${addressId}`)
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);
  });
});
