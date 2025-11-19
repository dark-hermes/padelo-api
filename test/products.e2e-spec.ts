import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Server } from 'http';
import { PrismaService } from 'src/prisma/prisma.service';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Products Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let server: Server;
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin12345';

  // Store IDs for cleanup
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let imageId1: string;
  let imageId2: string;

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
    // cast Nest's internal server to a typed Server for supertest
    server = app.getHttpServer() as unknown as Server;

    // Login to get access token
    const loginResponse = await request(server)
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(200);

    // Extract access token from cookies
    const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
    const accessTokenCookie = cookies.find((c) =>
      c.startsWith('access_token='),
    );
    if (accessTokenCookie) {
      accessToken = accessTokenCookie.split(';')[0].split('=')[1];
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Product Categories', () => {
    it('should create a product category', async () => {
      const response = await request(server)
        .post('/product-categories')
        .set('Cookie', [`access_token=${accessToken}`])
        .send({
          name: 'Electronics',
        })
        .expect(201);
      const body = response.body as unknown as {
        message?: string;
        category?: { id: string; name: string; slug: string };
      };

      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('category');
      expect(body.category).toHaveProperty('id');
      expect(body.category.name).toBe('Electronics');
      expect(body.category.slug).toBe('electronics');

      categoryId = body.category.id;
    });

    it('should list all product categories', async () => {
      const response = await request(server)
        .get('/product-categories')
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);
      const body = response.body as unknown as {
        data: unknown[];
        meta: unknown;
      };

      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should get a specific product category', async () => {
      const response = await request(server)
        .get(`/product-categories/${categoryId}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);
      const body = response.body as unknown as { id: string; name: string };

      expect(body).toHaveProperty('id');
      expect(body.id).toBe(categoryId);
      expect(body.name).toBe('Electronics');
    });
  });

  describe('Products', () => {
    it('should create a product', async () => {
      const response = await request(server)
        .post('/products')
        .set('Cookie', [`access_token=${accessToken}`])
        .send({
          name: 'Smartphone X',
          pageContent: {
            sections: [
              {
                type: 'hero',
                title: 'Smartphone X',
                subtitle: 'The best phone',
              },
              { type: 'features', items: ['5G', 'Camera', 'Battery'] },
            ],
          },
          categoryId: categoryId,
        })
        .expect(201);

      const body = response.body as unknown as {
        message?: string;
        product?: {
          id: string;
          name: string;
          slug: string;
          categoryId: string;
        };
      };

      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('product');
      expect(body.product).toHaveProperty('id');
      expect(body.product.name).toBe('Smartphone X');
      expect(body.product.slug).toBe('smartphone-x');
      expect(body.product.categoryId).toBe(categoryId);

      productId = body.product.id;
    });

    it('should list all products', async () => {
      const response = await request(server)
        .get('/products')
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as {
        data: unknown[];
        meta: unknown;
      };

      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should get a specific product', async () => {
      const response = await request(server)
        .get(`/products/${productId}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as {
        id: string;
        name: string;
        category: { id: string };
      };

      expect(body).toHaveProperty('id');
      expect(body.id).toBe(productId);
      expect(body.name).toBe('Smartphone X');
      expect(body).toHaveProperty('category');
      expect(body.category.id).toBe(categoryId);
    });
  });

  describe('Product Variants', () => {
    it('should create a product variant', async () => {
      const response = await request(server)
        .post('/products/variants')
        .set('Cookie', [`access_token=${accessToken}`])
        .send({
          name: 'Red - 64GB',
          price: 299.99,
          sku: 'SMARTPHONE-X-RED-64GB',
          stock: 50,
          weight: 0.185,
          productId: productId,
        })
        .expect(201);

      const body = response.body as unknown as {
        message?: string;
        variant?: { id: string; name: string; sku: string };
      };

      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('variant');
      expect(body.variant).toHaveProperty('id');
      expect(body.variant.name).toBe('Red - 64GB');
      expect(body.variant.sku).toBe('SMARTPHONE-X-RED-64GB');

      variantId = body.variant.id;
    });

    it('should list all variants for a product', async () => {
      const response = await request(server)
        .get(`/products/${productId}/variants`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const listBody = response.body as unknown as Array<{ productId: string }>;

      expect(Array.isArray(listBody)).toBe(true);
      expect(listBody.length).toBeGreaterThan(0);
      expect(listBody[0].productId).toBe(productId);
    });

    it('should get a specific variant', async () => {
      const response = await request(server)
        .get(`/products/variants/${variantId}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as { id: string; name: string };

      expect(body).toHaveProperty('id');
      expect(body.id).toBe(variantId);
      expect(body.name).toBe('Red - 64GB');
    });
  });

  describe('Product Images', () => {
    it('should create a product image via multipart upload', async () => {
      const response = await request(server)
        .post(`/products/variants/${variantId}/images`)
        .set('Cookie', [`access_token=${accessToken}`])
        .attach('images', 'test/fixtures/img1.jpg')
        .field('altText', 'Smartphone X Red - Front view')
        .expect(201);

      const body = response.body as unknown as {
        message?: string;
        images?: { id: string }[];
      };

      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('images');
      expect(Array.isArray(body.images)).toBe(true);
      expect(body.images.length).toBe(1);
      expect(body.images[0]).toHaveProperty('id');

      imageId1 = body.images[0].id;
    });

    it('should create a second product image via multipart upload', async () => {
      const response = await request(server)
        .post(`/products/variants/${variantId}/images`)
        .set('Cookie', [`access_token=${accessToken}`])
        .attach('images', 'test/fixtures/img2.jpg')
        .field('altText', 'Smartphone X Red - Back view')
        .expect(201);

      const body2 = response.body as unknown as { images?: { id: string }[] };

      expect(body2).toHaveProperty('images');
      expect(body2.images.length).toBe(1);
      imageId2 = body2.images[0].id;
    });

    it('should list all images for a variant', async () => {
      const response = await request(server)
        .get(`/products/variants/${variantId}/images`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const imagesList = response.body as unknown as Array<{
        productVariantId: string;
      }>;

      expect(Array.isArray(imagesList)).toBe(true);
      expect(imagesList.length).toBe(2);
      expect(imagesList[0].productVariantId).toBe(variantId);
    });

    it('should get a specific image', async () => {
      const response = await request(server)
        .get(`/products/images/${imageId1}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as { id: string };

      expect(body).toHaveProperty('id');
      expect(body.id).toBe(imageId1);
    });

    it('should not allow more than 4 images per variant (sequential uploads)', async () => {
      // Create 2 more images to reach the limit (sequential single uploads)
      await request(server)
        .post(`/products/variants/${variantId}/images`)
        .set('Cookie', [`access_token=${accessToken}`])
        .attach('images', 'test/fixtures/img3.jpg')
        .expect(201);

      await request(server)
        .post(`/products/variants/${variantId}/images`)
        .set('Cookie', [`access_token=${accessToken}`])
        .attach('images', 'test/fixtures/img4.jpg')
        .expect(201);

      // Try to add a 5th image - should fail with friendly message
      const res = await request(server)
        .post(`/products/variants/${variantId}/images`)
        .set('Cookie', [`access_token=${accessToken}`])
        .attach('images', 'test/fixtures/img5.jpg')
        .expect(400);

      const body = res.body as unknown as {
        statusCode?: number;
        message?: string;
      };
      expect(body).toHaveProperty('statusCode', 400);
      // service-level validation (sequential uploads) returns a different, detailed message
      expect(body).toHaveProperty(
        'message',
        'A product variant can have a maximum of 4 images. Current: 4, Attempting to add: 1',
      );
    });

    it('should return friendly error when uploading 5 files at once (multipart)', async () => {
      const res = await request(server)
        .post(`/products/variants/${variantId}/images`)
        .set('Cookie', [`access_token=${accessToken}`])
        .attach('images', 'test/fixtures/img1.jpg')
        .attach('images', 'test/fixtures/img2.jpg')
        .attach('images', 'test/fixtures/img3.jpg')
        .attach('images', 'test/fixtures/img4.jpg')
        .attach('images', 'test/fixtures/img5.jpg')
        .expect(400);

      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty(
        'message',
        'Maximum 4 images can be uploaded at once. Please reduce the number of files and try again.',
      );
    });
  });

  describe('Deletion', () => {
    it('should delete a product image', async () => {
      const response = await request(server)
        .delete(`/products/images/${imageId1}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);
      const body = response.body as unknown as { message?: string };

      expect(body).toHaveProperty('message');
    });

    it('should delete the second product image', async () => {
      const response = await request(server)
        .delete(`/products/images/${imageId2}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as { message?: string };
      expect(body).toHaveProperty('message');
    });

    it('should delete a product variant', async () => {
      const response = await request(server)
        .delete(`/products/variants/${variantId}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as { message?: string };
      expect(body).toHaveProperty('message');
    });

    it('should delete a product', async () => {
      const response = await request(server)
        .delete(`/products/${productId}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as { message?: string };
      expect(body).toHaveProperty('message');
    });

    it('should delete a product category', async () => {
      const response = await request(server)
        .delete(`/product-categories/${categoryId}`)
        .set('Cookie', [`access_token=${accessToken}`])
        .expect(200);

      const body = response.body as unknown as { message?: string };
      expect(body).toHaveProperty('message');
    });
  });
});
