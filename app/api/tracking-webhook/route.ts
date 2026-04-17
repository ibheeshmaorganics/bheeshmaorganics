import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    const providedToken = req.headers.get('x-api-key') || req.headers.get('authorization') || req.headers.get('x-api-hybrid-auth');

    // Securely lock the endpoint if the UI doesn't provide the exact secret (but silently return 200 for missing tokens during the initial Shiprocket test ping)
    if (expectedSecret && providedToken !== expectedSecret && providedToken !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ success: true, warning: 'Unauthorized Webhook Attempt Ignored' }, { status: 200 });
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ success: true, message: 'Ping received' }, { status: 200 }); // Handshake success
    }

    // Shiprocket sometimes sends test webhooks with missing properties
    if (!payload || Object.keys(payload).length === 0 || payload.test) {
       return NextResponse.json({ success: true, message: 'Test Ping Acknowledged' });
    }

    const awb = payload.awb || payload.awb_code || payload.shipment?.awb;
    const current_status = payload.current_status || payload.status || payload.shipment?.status;

    if (!awb || !current_status) {
      console.warn('[EXTERNAL WEBHOOK] Ignored Invalid Payload:', JSON.stringify(payload));
      return NextResponse.json({ success: true, warning: 'Invalid Payload Ignored' }, { status: 200 });
    }

    let internalStatus = current_status.toUpperCase();
    
    // Normalize Shiprocket's arbitrary string values into our strict Database schema states
    if (internalStatus.includes('RTO')) internalStatus = 'RTO';
    if (internalStatus.includes('CANCEL')) internalStatus = 'CANCELLED';

    await prisma.order.updateMany({
      where: { awbCode: awb },
      data: { status: internalStatus }
    });

    console.log(`[EXTERNAL WEBHOOK] Successfully Synced AWB ${awb} to DB Status: ${internalStatus}`);
    return NextResponse.json({ success: true, message: 'AWB Synced' });

  } catch (error) {
    console.error('Webhook Runtime Error:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

// Support for arbitrary GET ping tests during validation
export async function GET() {
  return NextResponse.json({ success: true, message: 'Webhook Endpoint Active' }, { status: 200 });
}
