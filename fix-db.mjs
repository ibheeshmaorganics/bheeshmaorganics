import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixDb() {
  console.log("Fixing historic paymentStatus in DB...");
  const orders = await prisma.order.findMany();
  let fixed = 0;
  for (const o of orders) {
    let correctPaymentStatus = 'payment processing/pending';
    
    if (o.paymentMethod === 'Cash' || o.paymentMethod === 'Cash on Delivery') {
      correctPaymentStatus = 'cod';
    } else if (o.paymentMethod === 'Razorpay') {
      if (['Processing', 'Shipped', 'Delivered'].includes(o.status)) {
        correctPaymentStatus = 'paid';
      } else {
        correctPaymentStatus = 'payment processing/pending';
      }
    }
    
    // We will just overwrite everyone's paymentStatus based on their historical lifecycle status.
    await prisma.order.update({
      where: { id: o.id },
      data: { paymentStatus: correctPaymentStatus }
    });
    fixed++;
  }
  console.log(`Successfully restored payment details for ${fixed} legacy orders!`);
}

fixDb()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
