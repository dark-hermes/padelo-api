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
