import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyAdminRequest } from '@/lib/server/auth';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    verifyAdminRequest(req);
    const body = await req.json();
    const { orderId, refundType } = body;

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

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    let refundAmount = order.totalAmount;
    let message = 'Full Refund Processed';

    if (refundType === 'deduct_99') {
      refundAmount = Math.max(0, order.totalAmount - 99);
      message = 'Partial Refund Processed (₹99 Deducted)';
    }

    if (refundAmount <= 0) {
       return NextResponse.json({ error: 'Calculated Refund amount is mathematically zero or less.' }, { status: 400 });
    }

    const refundRes = await razorpay.payments.refund(order.paymentId, {
      amount: Math.round(refundAmount * 100), 
      speed: "normal" 
    });
    
    const currentRefundId = refundRes.id;

    await prisma.order.update({
      where: { id: order.id },
      data: { 
        paymentStatus: 'refund initiated',
        refundId: currentRefundId
      },
    });

    return NextResponse.json({ success: true, message: `${message} (Ref: ${currentRefundId})`, refundId: currentRefundId });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error processing refund dynamically';
    console.error('Refund API Error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
