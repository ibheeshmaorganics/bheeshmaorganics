import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'payment failed' }
    });

    return NextResponse.json({ success: true, message: 'Marked as payment failed' });
  } catch (err: any) {
    console.error('Failed to mark order as failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
