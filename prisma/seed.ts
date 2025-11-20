// prisma/seed.ts
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data
  // Delete in dependency-safe order to avoid FK violations
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.team.deleteMany();

  // 2. Create permissions
  const permissions = [
    // User Permissions
    { action: 'create', subject: 'User' },
    { action: 'read', subject: 'User' },
    { action: 'update', subject: 'User' },
    { action: 'delete', subject: 'User' },
    // Role Permissions
    { action: 'create', subject: 'Role' },
    { action: 'read', subject: 'Role' },
    { action: 'update', subject: 'Role' },
    { action: 'delete', subject: 'Role' },
    // Product Permissions
    { action: 'create', subject: 'Product' },
    { action: 'read', subject: 'Product' },
    { action: 'update', subject: 'Product' },
    { action: 'delete', subject: 'Product' },
    // ProductCategory Permissions
    { action: 'create', subject: 'ProductCategory' },
    { action: 'read', subject: 'ProductCategory' },
    { action: 'update', subject: 'ProductCategory' },
    { action: 'delete', subject: 'ProductCategory' },
    // ProductVariant Permissions
    { action: 'create', subject: 'ProductVariant' },
    { action: 'read', subject: 'ProductVariant' },
    { action: 'update', subject: 'ProductVariant' },
    { action: 'delete', subject: 'ProductVariant' },
    // ProductImage Permissions
    { action: 'create', subject: 'ProductImage' },
    { action: 'read', subject: 'ProductImage' },
    { action: 'update', subject: 'ProductImage' },
    { action: 'delete', subject: 'ProductImage' },
    // Address Permissions
    { action: 'create', subject: 'Address' },
    { action: 'read', subject: 'Address' },
    { action: 'update', subject: 'Address' },
    { action: 'delete', subject: 'Address' },
    // Order Permissions
    { action: 'create', subject: 'Order' },
    { action: 'read', subject: 'Order' },
    { action: 'update', subject: 'Order' },
    { action: 'delete', subject: 'Order' },
    // CartItem Permissions
    { action: 'create', subject: 'CartItem' },
    { action: 'read', subject: 'CartItem' },
    { action: 'update', subject: 'CartItem' },
    { action: 'delete', subject: 'CartItem' },
    // OrderItem Permissions
    { action: 'create', subject: 'OrderItem' },
    { action: 'read', subject: 'OrderItem' },
    { action: 'update', subject: 'OrderItem' },
    { action: 'delete', subject: 'OrderItem' },
    // Setting Permissions
    { action: 'create', subject: 'Setting' },
    { action: 'read', subject: 'Setting' },
    { action: 'update', subject: 'Setting' },
    { action: 'delete', subject: 'Setting' },
    // Team Permissions
    { action: 'create', subject: 'Team' },
    { action: 'read', subject: 'Team' },
    { action: 'update', subject: 'Team' },
    { action: 'delete', subject: 'Team' },
    // Landing Permissions
    { action: 'create', subject: 'Landing' },
    { action: 'read', subject: 'Landing' },
    { action: 'update', subject: 'Landing' },
    { action: 'delete', subject: 'Landing' },
    // Additional permissions can be added here

    // All permission (for admin)
    { action: 'manage', subject: 'all' },
  ];
  await prisma.permission.createMany({ data: permissions });
  const allPermissions = await prisma.permission.findMany();

  // 3. Create roles
  const adminRole = await prisma.role.create({ data: { name: 'ADMIN' } });
  const userRole = await prisma.role.create({ data: { name: 'USER' } });

  // 4. Assign permissions to roles
  // Admin gets all permissions
  const manageAllPermission = allPermissions.find(
    (p) => p.action === 'manage' && p.subject === 'all',
  );
  if (manageAllPermission) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: manageAllPermission.id },
    });
  }

  // User gets read-only permissions on users
  // const readUserPermission = allPermissions.find(
  //   (p) => p.action === 'read' && p.subject === 'User',
  // );
  // if (readUserPermission) {
  //   await prisma.rolePermission.create({
  //     data: { roleId: userRole.id, permissionId: readUserPermission.id },
  //   });
  // }

  // All read permissions for USER role
  const readPermissions = allPermissions.filter((p) => p.action === 'read');
  for (const perm of readPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: userRole.id, permissionId: perm.id },
    });
  }

  // 5. Create users
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin123';
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin',
      password: hashedPassword,
    },
  });

  // 10 Regular users
  const regularUsersData = Array.from({ length: 10 }).map((_, i) => ({
    email: `user${i + 1}@example.com`,
    name: `User ${i + 1}`,
    password: hashedPassword,
  }));

  await prisma.user.createMany({
    data: regularUsersData,
  });

  // 6. Assign roles to users
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: adminRole.id },
  });

  const createdUsers = await prisma.user.findMany({
    where: { email: { in: regularUsersData.map((u) => u.email) } },
  });

  for (const user of createdUsers) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: userRole.id },
    });
  }

  // Also include admin user in the list for address seeding
  const allUsers = await prisma.user.findMany();

  // 8. Seed teams
  const teamsData = [
    {
      name: 'Alice Johnson',
      position: 'CEO',
      linkedin: 'https://linkedin.com/in/alice',
    },
    {
      name: 'Bob Santoso',
      position: 'CTO',
      linkedin: 'https://linkedin.com/in/bob',
    },
    {
      name: 'Carla Wijaya',
      position: 'Product Manager',
      linkedin: 'https://linkedin.com/in/carla',
    },
    {
      name: 'Dedi Prasetyo',
      position: 'Designer',
      linkedin: 'https://linkedin.com/in/dedi',
    },
  ];

  // Create teams (use createMany to keep simple)
  await prisma.team.createMany({ data: teamsData, skipDuplicates: true });

  // 9. Seed addresses: create 3 addresses for each user
  const addressTemplates = [
    {
      label: 'Home',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '10110',
    },
    {
      label: 'Office',
      city: 'Bandung',
      province: 'Jawa Barat',
      postalCode: '40111',
    },
    {
      label: 'Other',
      city: 'Surabaya',
      province: 'Jawa Timur',
      postalCode: '60234',
    },
  ];

  const addressesToCreate: Prisma.AddressCreateManyInput[] = [];
  let phoneCounter = 1000;
  for (const user of allUsers) {
    for (const tpl of addressTemplates) {
      phoneCounter += 1;
      addressesToCreate.push({
        label: tpl.label,
        recipient: user.name ?? user.email,
        phone: `0812345${phoneCounter}`,
        address: `${tpl.label} address for ${user.name ?? user.email}`,
        city: tpl.city,
        province: tpl.province,
        postalCode: tpl.postalCode,
        userId: user.id,
      });
    }
  }

  if (addressesToCreate.length > 0) {
    // createMany in batches (Prisma has limits on number of records sometimes)
    await prisma.address.createMany({
      data: addressesToCreate,
      skipDuplicates: true,
    });
  }

  // 7. Seed settings
  const settingsData = [
    { key: 'siteTitle', value: 'Padelo', label: 'Site Title' },
    { key: 'maintenanceMode', value: 'false', label: 'Maintenance Mode' },
    { key: 'autoLogoutTime', value: '30', label: 'Auto Logout Time (minutes)' },
  ];

  for (const setting of settingsData) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        label: setting.label,
      },
      create: setting,
    });
  }

  // 8. Seed Landing page and related data
  // Clean existing landing data first. Use a typed helper for optional delegates.
  type OptionalLandingDelegates = Partial<{
    landingReview: { deleteMany: () => Promise<unknown> };
    landingImageProduct: { deleteMany: () => Promise<unknown> };
    landingVideo: { deleteMany: () => Promise<unknown> };
    landing: { deleteMany: () => Promise<unknown> };
  }>;

  const p = prisma as PrismaClient & OptionalLandingDelegates;

  try {
    await p.landingReview?.deleteMany?.();
  } catch {
    // ignore if table doesn't exist in older schemas
  }
  try {
    await p.landingImageProduct?.deleteMany?.();
  } catch {
    // ignore
  }
  try {
    await p.landingVideo?.deleteMany?.();
  } catch {
    // ignore
  }
  try {
    await p.landing?.deleteMany?.();
  } catch {
    // ignore
  }
  const category = await prisma.productCategory.create({
    data: {
      name: 'Ball Picker',
      slug: 'ball-picker',
    },
  });

  const product = await prisma.product.create({
    data: {
      name: 'Ball Picker',
      slug: 'ball-picker',
      pageContent: {
        title: 'Ball Picker',
        description:
          'A selection of ball pickers in different styles and colors.',
        features: ['Ergonomic handle', 'Lightweight', 'Durable materials'],
      },
      categoryId: category.id,
    },
  });

  const variantSeed = [
    {
      name: 'White-Round',
      price: '75600',
      sku: 'BP-WHITE-RND',
      stock: 100,
      weight: '0.150',
      productId: product.id,
    },
    {
      name: 'Black-Round',
      price: '75600',
      sku: 'BP-BLACK-RND',
      stock: 100,
      weight: '0.150',
      productId: product.id,
    },
    {
      name: 'Pink-Round',
      price: '75600',
      sku: 'BP-PINK-RND',
      stock: 100,
      weight: '0.150',
      productId: product.id,
    },
    {
      name: 'Black-Hybrid',
      price: '81000',
      sku: 'BP-BLACK-HYB',
      stock: 80,
      weight: '0.200',
      productId: product.id,
    },
    {
      name: 'White-Hybrid',
      price: '81000',
      sku: 'BP-WHITE-HYB',
      stock: 80,
      weight: '0.200',
      productId: product.id,
    },
  ];

  // use createMany for variants (price and weight provided as strings to satisfy Decimal fields)
  await prisma.productVariant.createMany({
    data: variantSeed,
    skipDuplicates: true,
  });

  // fetch created variants to get their IDs
  const createdVariants = await prisma.productVariant.findMany({
    where: { productId: product.id },
  });

  // Move images from public/products -> uploads/products/{variantId}/ and create DB records.
  const publicProductsDir = path.join(process.cwd(), 'public', 'products');
  const uploadsProductsDir = path.join(process.cwd(), 'uploads', 'products');
  // Accept common image extensions
  const possibleExts = ['webp', 'jpg', 'jpeg', 'png'];

  const imagesData: Prisma.ProductImageCreateManyInput[] = [];

  let publicExists = true;
  let publicFiles: string[] = [];
  try {
    await fs.access(publicProductsDir);
    publicFiles = await fs.readdir(publicProductsDir);
  } catch {
    publicExists = false;
  }

  for (const v of createdVariants) {
    // normalize helpers
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const skuBase = (v.sku ?? `variant-${v.id}`).toString().toLowerCase();
    const nameBase = normalize(v.name ?? skuBase);
    const skuNormalized = normalize(skuBase);

    // potential filename bases to look for (in order of preference)
    const candidatesBases = [
      `${skuBase}-main`,
      `${skuBase}-thumb`,
      `${skuBase}`,
      skuNormalized,
      `${nameBase}-main`,
      `${nameBase}-thumb`,
      nameBase,
      `${nameBase.replace('-hyb', '-hybrid')}`, // try expanded form
      `${nameBase.replace('-hybrid', '-hyb')}`, // try short form
    ].filter(Boolean);

    const destDir = path.join(uploadsProductsDir, String(v.id));
    try {
      await fs.mkdir(destDir, { recursive: true });
    } catch {
      // ignore
    }

    // Find matching files in public folder for this variant
    const foundFiles: string[] = [];

    if (publicExists && publicFiles.length > 0) {
      // lower-case list for comparisons
      const publicFilesLC = publicFiles.map((f) => f.toLowerCase());

      for (const base of candidatesBases) {
        for (const ext of possibleExts) {
          const filename = `${base}.${ext}`;
          const idx = publicFilesLC.indexOf(filename);
          if (idx !== -1) {
            foundFiles.push(publicFiles[idx]); // preserve original casing
          }
        }
        if (foundFiles.length >= 2) break;
      }

      if (foundFiles.length === 0) {
        for (const f of publicFiles) {
          const fl = f.toLowerCase();
          if (
            possibleExts.some((ext) => fl.endsWith(`.${ext}`)) &&
            (fl.includes(nameBase) ||
              fl.includes(skuNormalized) ||
              fl.includes(nameBase.replace('-', '')))
          ) {
            foundFiles.push(f);
            if (foundFiles.length >= 2) break;
          }
        }
      }
    }

    // If we found files, copy up to two (main, thumb). Otherwise fallback to CDN entries.
    if (foundFiles.length > 0) {
      for (let i = 0; i < Math.min(foundFiles.length, 2); i++) {
        const srcFilename: string = foundFiles[i];
        const src = path.join(publicProductsDir, srcFilename);
        const ext = path.extname(srcFilename) || '';
        // standardize dest filename: main/thumb if possible, preserve ext
        const role = i === 0 ? 'main' : 'thumb';
        const destFilename = `${role}${ext}`;
        const dest = path.join(destDir, destFilename);

        let copied = false;
        try {
          // Always copy (do not remove original)
          await fs.copyFile(src, dest);
          copied = true;
        } catch (copyErr) {
          console.warn(`Failed to copy ${src} -> ${dest}:`, copyErr);
          copied = false;
        }

        if (copied) {
          imagesData.push({
            url: `/uploads/products/${v.id}/${destFilename}`,
            altText: `${product.name} - ${v.name}`,
            productVariantId: v.id,
          });
        } else {
          imagesData.push({
            url: `/uploads/products/${srcFilename}`,
            altText: `${product.name} - ${v.name}`,
            productVariantId: v.id,
          });
        }
      }

      if (foundFiles.length === 1) {
        imagesData.push({
          url: `/uploads/products/${nameBase}-thumb.webp`,
          altText: `${product.name} - ${v.name}`,
          productVariantId: v.id,
        });
      }
    } else {
      // No local files -> create CDN fallbacks for main and thumb
      imagesData.push(
        {
          url: `/uploads/products/${nameBase}-main.webp`,
          altText: `${product.name} - ${v.name}`,
          productVariantId: v.id,
        },
        {
          url: `/uploads/products/${nameBase}-thumb.webp`,
          altText: `${product.name} - ${v.name}`,
          productVariantId: v.id,
        },
      );
    }
  }

  if (imagesData.length > 0) {
    await prisma.productImage.createMany({
      data: imagesData,
      skipDuplicates: true,
    });
  }

  // If the `landing` delegate exists on the Prisma client, use it with a type guard.
  function hasLanding(client: PrismaClient): client is PrismaClient & {
    landing: {
      create: (args: Prisma.LandingCreateArgs) => Promise<{ title?: string }>;
    };
  } {
    // runtime check
    return 'landing' in client;
  }

  let landing: { title?: string } | null = null;

  if (hasLanding(prisma)) {
    landing = await prisma.landing.create({
      data: {
        title: 'Welcome to Padelo',
        content: '<p>Some HTML content</p>',
        reviews: {
          create: [
            {
              name: 'John Doe',
              comment: 'Amazing service!',
              rating: 5,
            },
          ],
        },
        imagesProduct: {
          create: [
            {
              url: '/uploads/landing/image1.jpg',
              title: 'Hero image',
              description: null,
              // price is required in the model; use 0.00 as default
              price: '0.00',
            },
          ],
        },
        videos: {
          create: [
            {
              url: 'https://youtu.be/abcd',
              title: 'Intro video',
            },
          ],
        },
      },
      include: { reviews: true, imagesProduct: true, videos: true },
    });
  } else {
    // landing model not present in generated client — skip seeding landing

    console.warn(
      'Prisma client does not include `landing` delegate; skipping landing seed.',
    );
  }

  if (landing) {
    console.log('Seeded landing');
  }

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
