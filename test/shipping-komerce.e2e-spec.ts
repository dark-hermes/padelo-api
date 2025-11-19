import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { KomerceShippingService } from '../src/shipping/komerce-shipping.service';

type DestinationResponse = { data: Array<{ id: number; name: string }> };
type TariffResponse = {
  data: Array<{ shipping: string; shipping_type: string; price: number }>;
};
type StoreOrderResponse = { order_no: string; status: string };
type SimpleSuccessResponse = { success: boolean };
type OrderDetailResponse = {
  order_no: string;
  shipping: string;
  status: string;
};
type HistoryResponse = { history: Array<{ status: string }> };
type PickupResponse = { pickup_id: string; scheduled: boolean };
type LabelResponse = { url: string };
type WebhookResponse = { received: boolean };

const destinationResponse: DestinationResponse = {
  data: [{ id: 1, name: 'Jakarta' }],
};
const tariffResponse: TariffResponse = {
  data: [{ shipping: 'NINJA', shipping_type: 'Standard', price: 12000 }],
};
const storeOrderResponse: StoreOrderResponse = {
  order_no: 'KOM123',
  status: 'CREATED',
};
const successResponse: SimpleSuccessResponse = { success: true };
const orderDetailResponse: OrderDetailResponse = {
  order_no: 'KOM123',
  shipping: 'NINJA',
  status: 'CREATED',
};
const historyResponse: HistoryResponse = { history: [{ status: 'PICKED' }] };
const pickupResponse: PickupResponse = { pickup_id: 'PU-1', scheduled: true };
const labelResponse: LabelResponse = {
  url: 'https://example.com/label.pdf',
};
const webhookResponse: WebhookResponse = { received: true };

describe('Komerce Shipping (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const mockKomerce: Partial<KomerceShippingService> = {
    searchDestination: () => Promise.resolve(destinationResponse),
    calculateTariff: () => Promise.resolve(tariffResponse),
    storeOrder: () => Promise.resolve(storeOrderResponse),
    cancelOrder: () => Promise.resolve(successResponse),
    getOrderDetail: () => Promise.resolve(orderDetailResponse),
    getOrderHistory: () => Promise.resolve(historyResponse),
    requestPickup: () => Promise.resolve(pickupResponse),
    printLabel: () => Promise.resolve(labelResponse),
    handleWebhook: () => webhookResponse,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KomerceShippingService)
      .useValue(mockKomerce)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

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
    // Ensure admin role and user exist (non-upsert to avoid race)
    let manageAll = await prisma.permission.findFirst({
      where: { action: 'manage', subject: 'all' },
    });
    if (!manageAll) {
      manageAll = await prisma.permission.create({
        data: { action: 'manage', subject: 'all', fields: [] },
      });
    }
    let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'ADMIN' } });
    }
    const existingRP = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionId: manageAll.id },
    });
    if (!existingRP) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: manageAll.id },
      });
    }
    const bcrypt = await import('bcrypt');
    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash('admin12345', salt);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { password: hashed },
      create: { email: 'admin@example.com', name: 'Admin', password: hashed },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'admin12345' })
      .expect(200);
    const cookies = (loginResponse.headers['set-cookie'] ??
      []) as unknown as string[];
    const access = cookies.find((c) => c.startsWith('access_token='));
    if (access) accessToken = access.split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /shipping/komerce/destinations should return destination data', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .get('/shipping/komerce/destinations?keyword=jkt')
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);
    const body = res.body as DestinationResponse;
    expect(body).toHaveProperty('data');
  });

  it('POST /shipping/komerce/cost should return tariff options', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .post('/shipping/komerce/cost')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({
        shipperDestinationId: 1,
        receiverDestinationId: 2,
        weight: 1,
        itemValue: 10000,
        cod: false,
      })
      .expect(200);
    const body = res.body as TariffResponse;
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /shipping/komerce/orders should create external order', async () => {
    const dto = {
      orderDate: '2025-11-18',
      brandName: 'Padelo',
      shipperName: 'Admin',
      shipperPhone: '0812',
      shipperDestinationId: 1,
      shipperAddress: 'Jl A',
      shipperEmail: 'admin@example.com',
      receiverName: 'Buyer',
      receiverPhone: '0813',
      receiverDestinationId: 2,
      receiverAddress: 'Jl B',
      shipping: 'NINJA',
      shippingType: 'Standard',
      paymentMethod: 'BANK TRANSFER',
      shippingCost: 12000,
      shippingCashback: 0,
      serviceFee: 0,
      additionalCost: 0,
      grandTotal: 12000,
      codValue: 0,
      insuranceValue: 0,
      orderDetails: [
        {
          productName: 'Item',
          productVariantName: 'Default',
          productPrice: 12000,
          productWeight: 200,
          productWidth: 10,
          productHeight: 5,
          productLength: 10,
          qty: 1,
          subtotal: 12000,
        },
      ],
    } as const;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .post('/shipping/komerce/orders')
      .set('Cookie', [`access_token=${accessToken}`])
      .send(dto)
      .expect(201);
    const body = res.body as StoreOrderResponse;
    expect(body.order_no).toBe('KOM123');
  });

  it('PATCH /shipping/komerce/orders/cancel should cancel external order', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .patch('/shipping/komerce/orders/cancel')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({ orderNo: 'KOM123' })
      .expect(200);
    const body = res.body as SimpleSuccessResponse;
    expect(body).toHaveProperty('success');
  });

  it('GET /shipping/komerce/orders/:orderNo should return detail', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .get('/shipping/komerce/orders/KOM123')
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);
    const body = res.body as OrderDetailResponse;
    expect(body.order_no).toBe('KOM123');
  });

  it('GET /shipping/komerce/orders/:orderNo/history should return awb history', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .get(
        '/shipping/komerce/orders/KOM123/history?shipping=NINJA&airwayBill=AWB1',
      )
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);
    const body = res.body as HistoryResponse;
    expect(body).toHaveProperty('history');
  });

  it('POST /shipping/komerce/pickups should schedule pickup', async () => {
    const payload = {
      pickupDate: '2025-11-19',
      pickupTime: '14:00',
      orders: [{ orderNo: 'KOM123' }],
    } as const;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .post('/shipping/komerce/pickups')
      .set('Cookie', [`access_token=${accessToken}`])
      .send(payload)
      .expect(201);
    const body = res.body as PickupResponse;
    expect(body).toHaveProperty('pickup_id');
  });

  it('POST /shipping/komerce/orders/label should return label URL', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .post('/shipping/komerce/orders/label')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({ orderNos: ['KOM123'] })
      .expect(201);
    const body = res.body as LabelResponse;
    expect(body).toHaveProperty('url');
  });

  it('PUT /shipping/komerce/webhook should accept webhook without auth', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await request(app.getHttpServer())
      .put('/shipping/komerce/webhook')
      .send({ order_no: 'KOM123', status: 'CREATED' })
      .expect(200);
    const body = res.body as WebhookResponse;
    expect(body).toHaveProperty('received');
  });
});
