import { NextResponse, NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth';
import Razorpay from 'razorpay';
import prisma from '@/lib/db';

type RefundRecord = Record<string, unknown> & {
  payment_id?: string;
};

type PaymentDetails = {
  method?: string;
  vpa?: string;
  bank?: string;
  wallet?: string;
  card?: { network?: string; last4?: string };
};

export async function GET(req: NextRequest) {
  try {
    verifyAdminRequest(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId');
  const refundId = searchParams.get('refundId');
  const orderId = searchParams.get('orderId');

  try {
    if (!paymentId && !refundId) {
      return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    let refunds: RefundRecord[] = [];
    let payment_id_to_fetch = paymentId;

    if (paymentId) {
      // fetch all refunds for a payment
      const refundsApi = razorpay.refunds as unknown as {
        all: (params: { payment_id: string }) => Promise<{ items?: RefundRecord[] }>;
      };
      const res = await refundsApi.all({ payment_id: paymentId });
      refunds = res.items || [];
    } else if (refundId) {
      const singleRefund = (await razorpay.refunds.fetch(refundId)) as unknown as RefundRecord;
      refunds = [singleRefund];
      payment_id_to_fetch = typeof singleRefund.payment_id === 'string' ? singleRefund.payment_id : null;
    }

    let paymentDetails: PaymentDetails | null = null;
    if (payment_id_to_fetch) {
      try {
        paymentDetails = (await razorpay.payments.fetch(payment_id_to_fetch)) as unknown as PaymentDetails;
      } catch (e) {
        console.error("Could not fetch payment details for refund mapping", e);
      }
    }

    const enhancedRefunds = refunds.map((r) => {
      let source = null;
      if (paymentDetails) {
        source = {
          method: paymentDetails.method,
          vpa: paymentDetails.vpa,
          bank: paymentDetails.bank,
          wallet: paymentDetails.wallet,
          card: paymentDetails.card ? `${paymentDetails.card.network} ...${paymentDetails.card.last4}` : null,
        };
      }
      return { ...r, payment_source: source };
    });

    if (orderId && enhancedRefunds.length > 0) {
      const latestRefund = enhancedRefunds
        .slice()
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          const aTime = typeof a.created_at === 'number' ? a.created_at : 0;
          const bTime = typeof b.created_at === 'number' ? b.created_at : 0;
          return bTime - aTime;
        })[0] as Record<string, unknown>;

      const latestStatus = String(latestRefund.status || 'pending').toLowerCase();
      const failureReason = String(
        latestRefund.error_description ||
        (typeof latestRefund.status_details === 'object' && latestRefund.status_details !== null && 'reason' in latestRefund.status_details
          ? (latestRefund.status_details as { reason?: string }).reason || ''
          : '')
      );
      const acquirerData = (typeof latestRefund.acquirer_data === 'object' && latestRefund.acquirer_data !== null)
        ? latestRefund.acquirer_data as Record<string, unknown>
        : null;
      const rrnFromGateway =
        (acquirerData && (acquirerData.rrn || acquirerData.arn || acquirerData.utr)) ||
        latestRefund.rrn ||
        latestRefund.arn ||
        null;

      const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (dbOrder) {
        const existingTimeline = Array.isArray(dbOrder.refundTimeline) ? dbOrder.refundTimeline : [];
        const timelineEvent = {
          stage: `gateway_${latestStatus}`,
          timestamp: new Date().toISOString(),
          refundId: String(latestRefund.id || dbOrder.refundId || ''),
          amount: Number(latestRefund.amount || 0) / 100,
          gatewayCreatedAt: typeof latestRefund.created_at === 'number' ? new Date(latestRefund.created_at * 1000).toISOString() : null,
          gatewayStatus: latestStatus,
          speedProcessed: String(latestRefund.speed_processed || ''),
          arn: String(latestRefund.arn || ''),
          rrn: rrnFromGateway ? String(rrnFromGateway) : '',
          paymentSource: latestRefund.payment_source || null,
          note: failureReason || `Gateway status synced: ${latestStatus}`,
        };
        const lastEvent = existingTimeline.length > 0 ? existingTimeline[existingTimeline.length - 1] as Record<string, unknown> : null;
        const shouldAppendTimeline =
          !lastEvent ||
          String(lastEvent.stage || '') !== String(timelineEvent.stage) ||
          String(lastEvent.refundId || '') !== String(timelineEvent.refundId);

        const nextPaymentStatus =
          latestStatus === 'processed'
            ? 'refunded'
            : latestStatus === 'failed'
              ? 'refund failed'
              : 'refund initiated';
        const latestRefundId = String(latestRefund.id || dbOrder.refundId || '');

        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: nextPaymentStatus,
            refundStatus: latestStatus,
            refundId: latestRefundId || dbOrder.refundId,
            refundFailureReason: latestStatus === 'failed' ? failureReason || 'Unknown gateway rejection.' : null,
            refundCompletedAt: latestStatus === 'processed' ? new Date() : dbOrder.refundCompletedAt,
            refundTimeline: shouldAppendTimeline ? [...existingTimeline, timelineEvent] : existingTimeline,
          },
        });
      }
    }

    return NextResponse.json({ success: true, refunds: enhancedRefunds });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching refund details';
    console.error('Refund Fetch API Error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
