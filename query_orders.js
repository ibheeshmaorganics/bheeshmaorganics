const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrders() {
  const orders = await prisma.order.findMany();
  console.log(orders.map(o => ({ id: o.id, status: o.status, paymentStatus: o.paymentStatus })));
}
checkOrders();
