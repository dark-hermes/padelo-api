import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Cart Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let server: Server;
  let productVariantId: string;
  let cartItemId: string;

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

    // Ensure maintenance mode is disabled
    await prisma.setting.upsert({
      where: { key: 'maintenanceMode' },
      update: { value: 'false' },
      create: {
        key: 'maintenanceMode',
        value: 'false',
        label: 'Maintenance Mode',
      },
    });

    await app.init();
    server = app.getHttpServer() as unknown as Server;

    // Login
    const loginResponse = await request(server)
      .post('/auth/login')
      .send({
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
      })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
    const accessTokenCookie = cookies.find((c) =>
      c.startsWith('access_token='),
    );
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.split(';')[0].split('=')[1];
    }

    // Seed minimal product + variant for cart
    const category = await prisma.productCategory.create({
      data: { name: 'CartCat', slug: `cartcat-${Date.now()}` },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Cart Product',
        slug: `cart-product-${Date.now()}`,
        pageContent: { sections: [] },
        categoryId: category.id,
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        name: 'Default Variant',
        price: 10,
        sku: `CART-SKU-${Date.now()}`,
        stock: 100,
        weight: 0.1,
        productId: product.id,
      },
    });
    productVariantId = variant.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should add item to cart', async () => {
    const res = await request(server)
      .post('/cart')
      .set('Cookie', [`access_token=${accessToken}`])
      .send({ productVariantId, quantity: 2 })
      .expect(201);

    const body = res.body as unknown as {
      item?: { id: string; quantity: number };
    };
    expect(body).toHaveProperty('item');
    expect(body.item).toHaveProperty('id');
    expect(body.item?.quantity).toBe(2);
    cartItemId = body.item.id;
  });

  it('should get my cart', async () => {
    const res = await request(server)
      .get('/cart')
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);
    const list = res.body as unknown as Array<{ id: string }>;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('should update cart item quantity', async () => {
    const res = await request(server)
      .patch(`/cart/${cartItemId}`)
      .set('Cookie', [`access_token=${accessToken}`])
      .send({ quantity: 3 })
      .expect(200);
    const body = res.body as unknown as { item?: { quantity: number } };
    expect(body).toHaveProperty('item');
    expect(body.item?.quantity).toBe(3);
  });

  it('should remove cart item', async () => {
    const res = await request(server)
      .delete(`/cart/${cartItemId}`)
      .set('Cookie', [`access_token=${accessToken}`])
      .expect(200);
    expect(res.body).toHaveProperty('message');
  });
});
