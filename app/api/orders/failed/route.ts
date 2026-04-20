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

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'payment failed', status: 'CANCELLED' }
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
