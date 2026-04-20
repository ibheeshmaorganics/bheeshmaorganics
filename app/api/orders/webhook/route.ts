import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import Razorpay from 'razorpay';

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
      const paymentId = event.payload.payment?.entity?.id;
      const dbOrderId = event.payload.order.entity.receipt;

      if (!dbOrderId) {
        return NextResponse.json({ error: 'No associated Receipt ID found.' }, { status: 400 });
      }

      const updated = await prisma.order.updateMany({
        where: { id: dbOrderId },
        data: {
          status: 'Pending',
          paymentStatus: 'paid',
          ...(paymentId && { paymentId }),
        },
      });

      if (updated.count === 0) {
        console.warn(`[WEBHOOK] Unknown receipt id received for order.paid: ${dbOrderId}`);
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }

      console.log(`[WEBHOOK] Order ${dbOrderId} successfully marked as Paid via Razorpay Webhook`);
    }

    // Handle Payment Failure
    if (event.event === 'payment.failed') {
      const razorpayOrderId = event.payload.payment.entity.order_id;
      
      try {
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
      } catch (err: unknown) {
         const webhookErr = err instanceof Error ? err.message : String(err);
         console.error('[WEBHOOK] Failed to update payment failure for order log:', webhookErr);
      }
    }

    // Handle asynchronous Refund Events from Razorpay natively
    if (event.event === 'refund.processed') {
      const refundId = event.payload.refund.entity.id;
      const paymentId = event.payload.refund.entity.payment_id;

      if (paymentId && refundId) {
        await prisma.order.updateMany({
          where: { paymentId: paymentId },
          data: { paymentStatus: 'refunded' }
        });
        console.log(`[WEBHOOK] Refund ${refundId} marked as successfully Refunded (Completed) for Payment ${paymentId}`);
      }
    }

    if (event.event === 'refund.failed') {
      const refundId = event.payload.refund.entity.id;
      const paymentId = event.payload.refund.entity.payment_id;

      if (paymentId) {
        await prisma.order.updateMany({
          where: { paymentId: paymentId },
          data: { paymentStatus: 'refund failed' }
        });
        console.error(`[WEBHOOK] BANK REFUND FAILED for ${refundId}. Please check Razorpay Dashboard.`);
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error';
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
