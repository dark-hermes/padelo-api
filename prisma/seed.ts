// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.address.deleteMany();
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

  // 5. Create users
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(
    process.env.DEFAULT_ADMIN_PASSWORD,
    salt,
  );

  const adminUser = await prisma.user.create({
    data: {
      email: process.env.DEFAULT_ADMIN_EMAIL,
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

  const addressesToCreate: Array<any> = [];
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
