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
  let komerceAddressId: string;

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

    // Ensure admin permission/role/user exist for tests
    let manageAll = await prisma.permission.findFirst({
      where: { action: 'manage', subject: 'all' },
    });
    if (!manageAll) {
      manageAll = await prisma.permission.create({
        data: { action: 'manage', subject: 'all', fields: [] },
      });
    }
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN' },
    });
    const existingRolePerm = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionId: manageAll.id },
    });
    if (!existingRolePerm) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: manageAll.id },
      });
    }
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin12345';
    // create user with bcrypt hashed password via application endpoint by calling auth register is not available; write direct
    const bcrypt = await import('bcrypt');
    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(adminPassword, salt);
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashed },
      create: { email: adminEmail, name: 'Admin', password: hashed },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });

    await app.init();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin12345',
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

  it('should create an address with Komerce fields and persist them', async () => {
    const payload = {
      label: 'Warehouse',
      recipient: 'Tester Two',
      phone: '0812999',
      address: 'Jl Gudang 123',
      city: 'Jakarta',
      province: 'DKI',
      postalCode: '10000',
      komerceDestinationId: 987654,
      komercePinPoint: '-6.2,106.8',
    } as const;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const createRes = await request(app.getHttpServer())
      .post('/addresses')
      .set('Cookie', [`access_token=${accessToken}`])
      .send(payload)
      .expect(201);

    type CreatedAddressBody = {
      address: {
        id: string;
        komerceDestinationId: number | null;
        komercePinPoint: string | null;
      };
    };
    const createBody = createRes.body as unknown as CreatedAddressBody;
    komerceAddressId = createBody.address.id;
    expect(createBody.address.komerceDestinationId).toBe(
      payload.komerceDestinationId,
    );
    expect(createBody.address.komercePinPoint).toBe(payload.komercePinPoint);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const getRes = await request(app.getHttpServer())
      .get(`/addresses/${komerceAddressId}`)
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);

    type GetAddressBody = {
      komerceDestinationId: number | null;
      komercePinPoint: string | null;
    };
    const got = getRes.body as unknown as GetAddressBody;
    expect(got.komerceDestinationId).toBe(payload.komerceDestinationId);
    expect(got.komercePinPoint).toBe(payload.komercePinPoint);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer())
      .delete(`/addresses/${komerceAddressId}`)
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);
  });

  it('should reject invalid komerceDestinationId type', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer())
      .post('/addresses')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({
        label: 'Bad',
        recipient: 'X',
        phone: '1',
        address: 'Y',
        city: 'C',
        province: 'P',
        postalCode: 'Z',
        // invalid type, should fail validation
        komerceDestinationId: 'not-a-number',
      })
      .expect(400);
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
