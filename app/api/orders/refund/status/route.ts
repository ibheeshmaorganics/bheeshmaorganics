import { NextResponse, NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth';
import Razorpay from 'razorpay';

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

    return NextResponse.json({ success: true, refunds: enhancedRefunds });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching refund details';
    console.error('Refund Fetch API Error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
