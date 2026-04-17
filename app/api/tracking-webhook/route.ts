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
    const shipmentId = payload.shipment_id?.toString() || payload.order_id?.toString();
    const current_status = payload.current_status || payload.status || payload.shipment?.status;

    if ((!awb && !shipmentId) || !current_status) {
      console.warn('[EXTERNAL WEBHOOK] Ignored Invalid Payload:', JSON.stringify(payload));
      return NextResponse.json({ success: true, warning: 'Invalid Payload Ignored' }, { status: 200 });
    }

    let internalStatus = current_status.toUpperCase();
    
    // Indestructible dictionary translating chaotic Courier/Shiprocket strings to Bheeshma Organics strict states
    if (internalStatus.includes('RTO') || internalStatus.includes('RETURN')) {
      internalStatus = 'RTO';
    } else if (internalStatus.includes('CANCEL')) {
      internalStatus = 'CANCELLED';
    } else if (internalStatus.includes('DELIVERED')) {
      internalStatus = 'DELIVERED';
    } else if (internalStatus.includes('OUT FOR DELIVERY')) {
      internalStatus = 'OUT_FOR_DELIVERY';
    } else if (internalStatus.includes('IN TRANSIT') || internalStatus.includes('SHIPPED') || internalStatus.includes('DISPATCH')) {
      internalStatus = 'SHIPPED';
    } else if (internalStatus.includes('READY') || internalStatus.includes('MANIFEST') || internalStatus.includes('PICKUP SCHEDULED')) {
      internalStatus = 'READY_TO_SHIP';
    } else if (internalStatus.includes('CONFIRM') || internalStatus.includes('PROCESS')) {
      internalStatus = 'CONFIRMED';
    }

    // Match dynamically via AWB if tracking hook, or Shiprocket shipment_id if order hook
    await prisma.order.updateMany({
      where: awb ? { awbCode: awb } : { shiprocketOrderId: shipmentId },
      data: { status: internalStatus }
    });

    console.log(`[EXTERNAL WEBHOOK] Successfully Synced to DB Status: ${internalStatus}`);
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
