import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { MidtransService } from 'src/orders/midtrans.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { KomerceShippingService } from 'src/shipping/komerce-shipping.service';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Orders Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let accessToken: string;
  let userId: string;
  let addressId: string;
  let productVariantId: string;
  let activeOrderId: string;
  let activeInvoice: string;

  const courierPayload = {
    courier: 'jne',
    courierService: 'REG',
  } as const;

  type CheckoutResponseBody = {
    message: string;
    order: {
      id: string;
      invoiceNumber: string;
      status: string;
      shippingResi?: string | null;
    };
    payment: { token: string };
  };

  type ShippingOptionsResponseBody = {
    reguler: Array<{
      serviceName: string;
      shippingCostOriginal: number;
      shippingCostEstimatedMin: number;
      shippingCostEstimatedMax: number;
    }>;
    cargo: Array<{
      serviceName: string;
      shippingCostOriginal: number;
      shippingCostEstimatedMin: number;
      shippingCostEstimatedMax: number;
    }>;
    instant: Array<{
      serviceName: string;
      shippingCostOriginal: number;
      shippingCostEstimatedMin: number;
      shippingCostEstimatedMax: number;
    }>;
  };

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin12345';

  const komerceCalculateMock = {
    data: {
      calculate_reguler: [
        {
          shipping_name: 'JNE',
          service_name: 'REG',
          weight: 1,
          is_cod: true,
          shipping_cost: 15000,
          shipping_cost_net: 14000,
          etd: '2-3',
        },
      ],
      calculate_cargo: [],
      calculate_instant: [],
    },
  };

  const midtransServiceMock: Partial<MidtransService> = {
    createTransaction: jest
      .fn()
      .mockImplementation(({ orderId }: { orderId: string }) =>
        Promise.resolve({
          token: `mock-token-${orderId}`,
          redirect_url: `https://midtrans.mock/${orderId}`,
        }),
      ),
  };

  const komerceServiceMock: Partial<KomerceShippingService> = {
    calculateTariff: jest.fn().mockResolvedValue(komerceCalculateMock),
    searchDestination: jest.fn().mockResolvedValue({
      data: [
        { id: 8161, zip_code: '12345' },
        { id: 25998, zip_code: '99999' },
      ],
    }),
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MidtransService)
      .useValue(midtransServiceMock)
      .overrideProvider(KomerceShippingService)
      .useValue(komerceServiceMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer() as unknown as Server;

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

    const bcrypt = await import('bcrypt');
    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(adminPassword, salt);
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashed, name: 'Admin' },
      create: {
        email: adminEmail,
        name: 'Admin',
        password: hashed,
      },
    });
    userId = adminUser.id;

    const existingAddress = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (existingAddress) {
      addressId = existingAddress.id;
    } else {
      const newAddress = await prisma.address.create({
        data: {
          userId,
          label: 'Main',
          recipient: 'Admin',
          phone: '08123456789',
          address: 'Jl. Test No. 1',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '12345',
        },
      });
      addressId = newAddress.id;
    }

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
    const accessTokenCookie = cookies.find((cookieStr) =>
      cookieStr.startsWith('access_token='),
    );
    if (!accessTokenCookie) {
      throw new Error('access token cookie not found');
    }
    accessToken = accessTokenCookie.split(';')[0].split('=')[1];

    if (!addressId) {
      throw new Error('address not seeded');
    }

    // Ensure destinationId preset to bypass search fallback in tests
    await prisma.address.update({
      where: { id: addressId },
      data: { komerceDestinationId: 8161 },
    });

    const category = await prisma.productCategory.create({
      data: { name: 'OrderCat', slug: `order-cat-${Date.now()}` },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Order Product',
        slug: `order-product-${Date.now()}`,
        pageContent: { sections: [] },
        categoryId: category.id,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        name: 'Variant A',
        price: 15000,
        sku: `ORDER-SKU-${Date.now()}`,
        stock: 50,
        weight: 0.2,
        productId: product.id,
      },
    });
    productVariantId = variant.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const createCartItem = async (quantity = 1) => {
    const cart = await prisma.cartItem.upsert({
      where: {
        userId_productVariantId: { userId, productVariantId },
      },
      update: { quantity },
      create: {
        userId,
        productVariantId,
        quantity,
      },
    });
    return cart.id;
  };

  it('should provide Komerce shipping options for selected cart items with cost ranges', async () => {
    const cartItemId = await createCartItem(2);

    const res = await request(server)
      .post('/orders/shipping-options')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({
        cartItemIds: [cartItemId],
        addressId,
      })
      .expect(200);

    const body = res.body as ShippingOptionsResponseBody;
    expect(Array.isArray(body.reguler)).toBe(true);
    expect(Array.isArray(body.cargo)).toBe(true);
    expect(Array.isArray(body.instant)).toBe(true);
    expect(body.reguler.length).toBeGreaterThan(0);
    const first = body.reguler[0];
    expect(first.serviceName.toUpperCase()).toBe('REG');
    expect(first.shippingCostOriginal).toBe(14000);
    expect(first.shippingCostEstimatedMin).toBe(15000);
    expect(first.shippingCostEstimatedMax).toBe(16000);
  });

  it('should create checkout and order from cart items and persist cost snapshots', async () => {
    const cartItemId = await createCartItem(1);

    const res = await request(server)
      .post('/orders/checkout')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({
        cartItemIds: [cartItemId],
        addressId,
        ...courierPayload,
      })
      .expect(201);

    const body = res.body as CheckoutResponseBody;
    expect(body.order.status).toBe('PENDING');

    activeOrderId = body.order.id;
    activeInvoice = body.order.invoiceNumber;

    // Validate persisted shipping cost snapshots & courier names
    const created = await prisma.order.findUnique({
      where: { id: activeOrderId },
    });
    if (!created) throw new Error('Created order not found');
    expect(Number(created.shippingCostOriginal)).toBe(14000);
    expect(Number(created.shippingCostEstimatedMin)).toBe(15000);
    expect(Number(created.shippingCostEstimatedMax)).toBe(16000);
    expect(created.shippingName).toBe('JNE');
    expect(created.shippingServiceName).toBe('REG');
  });

  it('should list my orders and include the latest order', async () => {
    const res = await request(server)
      .get('/orders/me')
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);

    const list = res.body as Array<{ id: string }>;
    expect(list.some((order) => order.id === activeOrderId)).toBe(true);
  });

  it('should allow cancelling my pending order', async () => {
    const res = await request(server)
      .patch(`/orders/${activeOrderId}/cancel`)
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);

    const body = res.body as { order: { status: string } };
    expect(body.order.status).toBe('CANCELLED');
  });

  it('should update status to PAID when Midtrans webhook settles payment', async () => {
    const cartItemId = await createCartItem(1);
    const checkoutRes = await request(server)
      .post('/orders/checkout')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({
        cartItemIds: [cartItemId],
        addressId,
        ...courierPayload,
      })
      .expect(201);

    const checkoutBody = checkoutRes.body as CheckoutResponseBody;
    activeOrderId = checkoutBody.order.id;
    activeInvoice = checkoutBody.order.invoiceNumber;

    const webhookRes = await request(server)
      .post('/orders/midtrans/notification')
      .send({
        order_id: activeInvoice,
        transaction_status: 'settlement',
      })
      .expect(200);

    const webhookBody = webhookRes.body as { order: { status: string } };
    expect(webhookBody.order.status).toBe('PAID');
  });

  it('should allow admin to update shipping info after payment', async () => {
    const res = await request(server)
      .patch(`/orders/${activeOrderId}/shipping`)
      .set('Cookie', [`access_token=${accessToken}`])
      .send({
        courier: 'JNE YES',
        trackingNumber: 'TRACK123',
      })
      .expect(200);

    const body = res.body as {
      order: { status: string; shippingResi: string };
    };
    expect(body.order.status).toBe('SHIPPED');
    expect(body.order.shippingResi).toBe('TRACK123');
  });
});
