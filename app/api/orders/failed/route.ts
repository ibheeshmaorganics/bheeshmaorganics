import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyAdminRequest } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    verifyAdminRequest(req);
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const method = (order.paymentMethod || '').toLowerCase();
    if (method === 'cash' || method === 'cod') {
      return NextResponse.json({ error: 'COD orders cannot be marked as payment failed.' }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'payment failed', status: 'FAILED' }
    });

    return NextResponse.json({ success: true, message: 'Marked as payment failed' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to mark order as failed';
    console.error('Failed to mark order as failed:', err);
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
