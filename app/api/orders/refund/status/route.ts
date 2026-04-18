import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bheeshma_super_secret_key_2026';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId');
  const refundId = searchParams.get('refundId');

  // Allow public access ONLY if querying by a specific Razorpay paymentId or refundId structure
  if (!token && !paymentId?.startsWith('pay_') && !refundId?.startsWith('rfnd_')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (token) {
      jwt.verify(token, JWT_SECRET);
    }

    if (!paymentId && !refundId) {
      return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
    }

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    let refunds = [];
    if (paymentId) {
      // fetch all refunds for a payment
      const res = await razorpay.refunds.all({ payment_id: paymentId });
      refunds = res.items || [];
    } else if (refundId) {
      const singleRefund = await razorpay.refunds.fetch(refundId);
      refunds = [singleRefund];
    }

    return NextResponse.json({ success: true, refunds });

  } catch (error: any) {
    console.error('Refund Fetch API Error:', error);
    return NextResponse.json({ error: error.message || 'Error fetching refund details' }, { status: 500 });
  }
}
