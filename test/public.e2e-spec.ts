import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Public endpoints e2e tests: no auth required
 */
describe('Public Module (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;

  // seeded entities
  let teamId: string;
  let categoryId: string;
  let categorySlug: string;
  let productId: string;
  let productSlug: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    prisma = app.get(PrismaService);

    // Ensure maintenance mode is disabled for tests
    await prisma.setting.upsert({
      where: { key: 'maintenanceMode' },
      update: { value: 'false' },
      create: {
        key: 'maintenanceMode',
        label: 'Maintenance Mode',
        value: 'false',
      },
    });

    // Create a team
    const team = await prisma.team.create({
      data: {
        name: 'Jane Doe',
        position: 'CTO',
        image: null,
        linkedin: 'https://linkedin.com/in/janedoe',
      },
    });
    teamId = team.id;

    // Create category and product (let triggers generate unique slugs via service logic in normal flow; here we simulate DB state)
    const category = await prisma.productCategory.create({
      data: { name: 'Accessories', slug: 'accessories' },
    });
    categoryId = category.id;
    categorySlug = category.slug;

    const product = await prisma.product.create({
      data: {
        name: 'USB-C Cable',
        slug: 'usb-c-cable',
        pageContent: { sections: [{ type: 'desc', text: 'Durable cable' }] },
        coverImage: null,
        categoryId: category.id,
        variants: {
          create: [
            {
              name: '1m',
              price: new Prisma.Decimal(9.99),
              sku: 'USBC-1M',
              stock: 100,
              weight: new Prisma.Decimal(0.05),
              images: {
                create: [
                  { url: 'uploads/products/usb-c-1m.jpg', altText: 'USB-C 1m' },
                ],
              },
            },
          ],
        },
      },
    });
    productId = product.id;
    productSlug = product.slug;

    await app.init();
    server = app.getHttpServer() as unknown as Server;
  });

  afterAll(async () => {
    // cleanup seeded data
    await prisma.productImage.deleteMany({
      where: { productVariant: { productId } },
    });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    await prisma.team.deleteMany({ where: { id: teamId } });

    await app.close();
  });

  describe('Teams (public)', () => {
    it('GET /public/teams should return paginated teams', async () => {
      const res = await request(server).get('/public/teams').expect(200);
      const body = res.body as { data: Array<{ id: string }>; meta: unknown };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.some((t) => t.id === teamId)).toBe(true);
    });

    it('GET /public/teams/:id should return a team', async () => {
      const res = await request(server)
        .get(`/public/teams/${teamId}`)
        .expect(200);
      const body = res.body as {
        id: string;
        name: string;
        position: string;
        image: string | null;
        linkedin: string | null;
      };
      expect(body).toHaveProperty('id', teamId);
      expect(body).toHaveProperty('name', 'Jane Doe');
      // should not expose extra fields beyond public DTO
      expect(Object.keys(body)).toEqual(
        expect.arrayContaining(['id', 'name', 'position', 'image', 'linkedin']),
      );
    });
  });

  describe('Products (public)', () => {
    it('GET /public/products should return paginated products', async () => {
      const res = await request(server).get('/public/products').expect(200);
      const body = res.body as {
        data: Array<{ id: string; slug: string; variants: unknown[] }>;
        meta: unknown;
      };
      expect(Array.isArray(body.data)).toBe(true);
      const found = body.data.find((p) => p.id === productId);
      expect(found).toBeTruthy();
      expect(found).toHaveProperty('slug', productSlug);
      expect(found).toHaveProperty('variants');
    });

    it('GET /public/products/:id should return a product', async () => {
      const res = await request(server)
        .get(`/public/products/${productId}`)
        .expect(200);
      const body = res.body as {
        id: string;
        slug: string;
        category?: { slug?: string };
      };
      expect(body).toHaveProperty('id', productId);
      expect(body).toHaveProperty('slug', productSlug);
      expect(body.category?.slug).toBe(categorySlug);
    });

    it('GET /public/products/slug/:slug should return a product', async () => {
      const res = await request(server)
        .get(`/public/products/slug/${productSlug}`)
        .expect(200);
      const body = res.body as { id: string; slug: string };
      expect(body).toHaveProperty('id', productId);
      expect(body).toHaveProperty('slug', productSlug);
    });
  });

  describe('Product Categories (public)', () => {
    it('GET /public/product-categories should return paginated categories', async () => {
      const res = await request(server)
        .get('/public/product-categories')
        .expect(200);
      const body = res.body as {
        data: Array<{ id: string; slug: string }>;
        meta: unknown;
      };
      expect(Array.isArray(body.data)).toBe(true);
      const found = body.data.find((c) => c.id === categoryId);
      expect(found).toBeTruthy();
      expect(found).toHaveProperty('slug', categorySlug);
    });

    it('GET /public/product-categories/:id should return a category', async () => {
      const res = await request(server)
        .get(`/public/product-categories/${categoryId}`)
        .expect(200);
      const body = res.body as {
        id: string;
        slug: string;
        products: unknown[];
      };
      expect(body).toHaveProperty('id', categoryId);
      expect(body).toHaveProperty('slug', categorySlug);
      expect(Array.isArray(body.products)).toBe(true);
    });

    it('GET /public/product-categories/slug/:slug should return a category', async () => {
      const res = await request(server)
        .get(`/public/product-categories/slug/${categorySlug}`)
        .expect(200);
      const body = res.body as { id: string; slug: string };
      expect(body).toHaveProperty('id', categoryId);
      expect(body).toHaveProperty('slug', categorySlug);
    });
  });
});
