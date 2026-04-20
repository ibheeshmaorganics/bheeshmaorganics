import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error("Razorpay Secret Key not found in Environment");
    }

    // Razorpay signature verification logic
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials are missing.');
      }

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const gatewayOrder = await razorpay.orders.fetch(razorpay_order_id);
      if (!gatewayOrder || gatewayOrder.receipt !== orderId) {
        return NextResponse.json({ error: 'Order mismatch during verification' }, { status: 400 });
      }

      const currentMethod = order?.paymentMethod || 'Razorpay';
      const isCod = currentMethod === 'Cash';

      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'Pending', 
          paymentStatus: isCod ? 'cod (Advance Paid)' : 'paid',
          paymentId: razorpay_payment_id
        } // Preserve in Pending/NEW tab natively
      });

      return NextResponse.json({ success: true, message: 'Payment successfully verified' });
    } else {
      // If signature doesn't match, it might be a spoofed request
      return NextResponse.json({ error: 'Invalid Payment Signature' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
    console.error("Verification Error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
