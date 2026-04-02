const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.time('findOrders');
prisma.order.findMany({ where: { phone: '9999999999' } })
  .then(() => console.timeEnd('findOrders'))
  .finally(() => prisma.$disconnect());
