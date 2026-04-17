import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Missing Signature or Webhook Secret' }, { status: 400 });
    }

    // Verify exactly that Razorpay is the one sending this using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 400 });
    }

    // Parse the event natively
    const event = JSON.parse(rawBody);

    // Razorpay explicitly triggers 'order.paid' when the payment is fully captured natively
    if (event.event === 'order.paid') {
      const razorpayOrderId = event.payload.order.entity.id;
      const paymentId = event.payload.payment?.entity?.id;
      const dbOrderId = event.payload.order.entity.receipt;

      if (!dbOrderId) {
        return NextResponse.json({ error: 'No associated Receipt ID found.' }, { status: 400 });
      }

      await prisma.order.update({
        where: { id: dbOrderId },
        data: { 
          status: 'Processing', 
          paymentStatus: 'paid',
          ...(paymentId && { paymentId })
        }
      });

      console.log(`[WEBHOOK] Order ${dbOrderId} successfully marked as Paid via Razorpay Webhook`);
    }

    // Handle Payment Failure
    if (event.event === 'payment.failed') {
      const razorpayOrderId = event.payload.payment.entity.order_id;
      
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        
        const rzpOrder = await razorpay.orders.fetch(razorpayOrderId);
        const dbOrderId = rzpOrder.receipt;
        
        if (dbOrderId) {
          await prisma.order.update({
             where: { id: dbOrderId },
             data: { paymentStatus: 'payment failed', status: 'CANCELLED' }
          });
          console.log(`[WEBHOOK] Order ${dbOrderId} marked as Payment Failed`);
        }
      } catch (err: any) {
         console.error(`[WEBHOOK] Failed to update payment failure for order log:`, err.message);
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
