import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bheeshma_super_secret_key_2026';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    jwt.verify(token, JWT_SECRET);
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const isCod = order.paymentMethod === 'Cash' || order.paymentMethod?.toLowerCase() === 'cod';

    // Business Logic: COD Advance 99 INR is NON-Refundable. 
    if (isCod) {
      return NextResponse.json({ error: 'COD Advances (₹99) are strictly non-refundable.' }, { status: 400 });
    }

    if (!order.paymentId) {
      return NextResponse.json({ error: 'No associated Razorpay Payment ID found for automatic refund. Please refund manually in Razorpay Dashboard.' }, { status: 400 });
    }

    if (order.status !== 'CANCELLED' && order.status !== 'RTO') {
      return NextResponse.json({ error: 'Refunds can only be processed if the order status is currently CANCELLED or RTO.' }, { status: 400 });
    }

    if (order.paymentStatus === 'refunded') {
      return NextResponse.json({ error: 'This order has already been refunded.' }, { status: 400 });
    }

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // If perfectly Cancelled, fully refund. If RTO, dock shipping fee.
    let refundAmount = order.totalAmount;
    let message = 'Full Refund Processed';

    if (order.status === 'RTO') {
      refundAmount = Math.max(0, order.totalAmount - 99);
      message = 'RTO Partial Refund Processed (₹99 Courier Fee Deducted)';
    }

    if (refundAmount <= 0) {
       return NextResponse.json({ error: 'Calculated Refund amount is mathematically zero or less.' }, { status: 400 });
    }

    // Call Razorpay APIs natively
    const refundRes = await razorpay.payments.refund(order.paymentId, {
      amount: Math.round(refundAmount * 100), // convert to paise
      speed: "normal" // Can be "optimum" for instant refund, but requires Razorpay account config
    });

    // Mark as refunded internally and log the transaction Ref ID
    await prisma.order.update({
      where: { id: order.id },
      data: { 
        paymentStatus: 'refunded',
        refundId: refundRes.id
      } as any // Allow new schema field bypass if prisma hasn't regenerated globally
    });

    return NextResponse.json({ success: true, message: `${message} (Ref: ${refundRes.id})`, refundId: refundRes.id });

  } catch (error: any) {
    console.error('Refund API Error:', error);
    return NextResponse.json({ error: error.message || 'Error processing refund dynamically' }, { status: 500 });
  }
}
