import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';

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
      // Securely update the database state
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'Processing', paymentStatus: 'paid' } // Set status to Processing/Paid natively
      });

      return NextResponse.json({ success: true, message: 'Payment successfully verified' });
    } else {
      // If signature doesn't match, it might be a spoofed request
      return NextResponse.json({ error: 'Invalid Payment Signature' }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
