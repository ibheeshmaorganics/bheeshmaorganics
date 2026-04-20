import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { verifyAdminRequest } from '@/lib/server/auth';
import Razorpay from 'razorpay';
import { Prisma } from '@prisma/client';

function getRefundTimeline(order: { refundTimeline: unknown }): Record<string, unknown>[] {
  return Array.isArray(order.refundTimeline) ? (order.refundTimeline as Record<string, unknown>[]) : [];
}

function toPrismaJsonArray(value: Record<string, unknown>[]): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

async function appendRefundTimeline(
  orderId: string,
  existingTimeline: Record<string, unknown>[],
  event: Record<string, unknown>,
  extraData: Prisma.OrderUpdateInput = {}
) {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      refundTimeline: toPrismaJsonArray([...existingTimeline, event]),
      ...extraData,
    },
  });
}

export async function POST(req: NextRequest) {
  let requestedOrderId: string | undefined;
  try {
    verifyAdminRequest(req);
    const body = await req.json();
    const { orderId } = body;
    requestedOrderId = orderId;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const existingTimeline = getRefundTimeline(order);
    const requestEvent = {
      stage: 'refund_requested_by_admin',
      timestamp: new Date().toISOString(),
      source: 'admin',
      orderStatus: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      note: 'Admin triggered refund action.',
    };
    await appendRefundTimeline(order.id, existingTimeline, requestEvent);
    const timelineAfterRequest = [...existingTimeline, requestEvent];

    const normalizedMethod = (order.paymentMethod || '').toLowerCase();
    const isEligiblePaymentType = normalizedMethod === 'razorpay' || normalizedMethod === 'partial';
    if (!isEligiblePaymentType) {
      await appendRefundTimeline(order.id, timelineAfterRequest, {
        stage: 'refund_rejected',
        timestamp: new Date().toISOString(),
        source: 'system',
        note: 'Rejected: refund allowed only for online or partial orders.',
      });
      return NextResponse.json({ error: 'Refund allowed only for online or partial payment orders.' }, { status: 400 });
    }

    if (!order.paymentId) {
      await appendRefundTimeline(order.id, timelineAfterRequest, {
        stage: 'refund_rejected',
        timestamp: new Date().toISOString(),
        source: 'system',
        note: 'Rejected: missing paymentId for gateway refund.',
      });
      return NextResponse.json({ error: 'No associated Razorpay Payment ID found for automatic refund. Please refund manually in Razorpay Dashboard.' }, { status: 400 });
    }

    if (order.status !== 'CANCELLED' && order.status !== 'RTO') {
      await appendRefundTimeline(order.id, timelineAfterRequest, {
        stage: 'refund_rejected',
        timestamp: new Date().toISOString(),
        source: 'system',
        note: `Rejected: order status must be CANCELLED/RTO, got ${order.status}.`,
      });
      return NextResponse.json({ error: 'Refunds can only be processed if the order status is currently CANCELLED or RTO.' }, { status: 400 });
    }

    if (order.paymentStatus === 'refunded') {
      await appendRefundTimeline(order.id, timelineAfterRequest, {
        stage: 'refund_rejected',
        timestamp: new Date().toISOString(),
        source: 'system',
        note: 'Rejected: order already marked refunded.',
      });
      return NextResponse.json({ error: 'This order has already been refunded.' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const paymentPayload = await razorpay.payments.fetch(order.paymentId) as unknown as {
      amount?: number;
      amount_captured?: number;
    };
    const capturedPaise = Number(paymentPayload.amount_captured || paymentPayload.amount || 0);
    const capturedAmount = Math.round(capturedPaise) / 100;

    if (capturedAmount <= 0) {
      await appendRefundTimeline(order.id, timelineAfterRequest, {
        stage: 'refund_rejected',
        timestamp: new Date().toISOString(),
        source: 'system',
        note: 'Rejected: payment not captured yet.',
      });
      return NextResponse.json({ error: 'Payment is not captured yet. Refund cannot be initiated.' }, { status: 400 });
    }

    // Never attempt to refund beyond the gateway-captured amount.
    const refundAmount = Math.min(order.totalAmount, capturedAmount);
    const message = `Refund initiated for captured amount ₹${refundAmount.toFixed(2)}`;

    if (refundAmount <= 0) {
       return NextResponse.json({ error: 'Calculated Refund amount is mathematically zero or less.' }, { status: 400 });
    }

    const refundRes = await razorpay.payments.refund(order.paymentId, {
      amount: Math.round(refundAmount * 100), 
      speed: "normal" 
    });
    
    const currentRefundId = refundRes.id;
    const initiatedAt = new Date();
    const initiatedEvent = {
      stage: 'gateway_refund_created',
      timestamp: initiatedAt.toISOString(),
      source: 'admin',
      refundId: currentRefundId,
      amount: refundAmount,
      paymentId: order.paymentId,
      gatewayStatus: refundRes.status,
      speedRequested: 'normal',
      orderStatusAtRefund: order.status,
      note: 'Refund request accepted by gateway.',
    };

    await prisma.order.update({
      where: { id: order.id },
      data: { 
        paymentStatus: 'refund initiated',
        refundStatus: 'initiated',
        refundFailureReason: null,
        refundInitiatedAt: initiatedAt,
        refundId: currentRefundId,
        refundTimeline: toPrismaJsonArray([...timelineAfterRequest, initiatedEvent])
      },
    });

    return NextResponse.json({ success: true, message: `${message} (Ref: ${currentRefundId})`, refundId: currentRefundId });

  } catch (error: unknown) {
    const err = error as {
      message?: string;
      statusCode?: number;
      error?: { description?: string; reason?: string; code?: string };
    };
    const gatewayDescription = err?.error?.description;
    const gatewayReason = err?.error?.reason;
    const gatewayCode = err?.error?.code;
    const fallbackMessage = err?.message || 'Error processing refund dynamically';
    const errorMessage = gatewayDescription
      ? `${gatewayDescription}${gatewayCode ? ` [${gatewayCode}]` : ''}${gatewayReason && gatewayReason !== 'NA' ? ` - ${gatewayReason}` : ''}`
      : fallbackMessage;
    console.error('Refund API Error:', error);
    if (requestedOrderId) {
      const dbOrder = await prisma.order.findUnique({ where: { id: requestedOrderId } }).catch(() => null);
      if (dbOrder) {
        const existingTimeline = getRefundTimeline(dbOrder);
        await appendRefundTimeline(dbOrder.id, existingTimeline, {
          stage: 'refund_api_error',
          timestamp: new Date().toISOString(),
          source: 'system',
          note: errorMessage,
        }, {
          paymentStatus: 'refund failed',
          refundStatus: 'failed',
          refundFailureReason: errorMessage,
        }).catch(() => null);
      }
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
