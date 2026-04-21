import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    const providedToken = req.headers.get('x-api-key') || req.headers.get('authorization') || req.headers.get('x-api-hybrid-auth');

    // Accept webhook when token header is missing (Shiprocket may omit it on some callbacks),
    // but reject when a token is present and explicitly wrong.
    if (expectedSecret && providedToken && providedToken !== expectedSecret && providedToken !== `Bearer ${expectedSecret}`) {
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

    const awb =
      payload.awb ||
      payload.awb_code ||
      payload.awbCode ||
      payload.shipment?.awb ||
      payload.shipment?.awb_code;
    const shipmentId =
      payload.shipment_id?.toString() ||
      payload.shipment?.id?.toString() ||
      payload.order_id?.toString();
    const channelOrderId =
      payload.channel_order_id?.toString() ||
      payload.channelOrderId?.toString() ||
      payload.order?.channel_order_id?.toString() ||
      payload.shipment?.channel_order_id?.toString() ||
      '';
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
    } else if (internalStatus.includes('IN TRANSIT')) {
      internalStatus = 'IN_TRANSIT';
    } else if (internalStatus.includes('SHIPPED') || internalStatus.includes('DISPATCH')) {
      internalStatus = 'SHIPPED';
    } else if (internalStatus.includes('READY') || internalStatus.includes('MANIFEST') || internalStatus.includes('PICKUP SCHEDULED')) {
      internalStatus = 'READY_TO_SHIP';
    } else if (internalStatus.includes('CONFIRM') || internalStatus.includes('PROCESS')) {
      internalStatus = 'CONFIRMED';
    }

    const shipmentIdNormalized = shipmentId ? String(shipmentId).trim() : '';
    const channelOrderIdNormalized = channelOrderId ? String(channelOrderId).trim() : '';
    const shortOrderIdFromShipmentId = shipmentIdNormalized.startsWith('BO-') ? shipmentIdNormalized : `BO-${shipmentIdNormalized}`;
    const shortOrderIdFromChannelId = channelOrderIdNormalized.startsWith('BO-') ? channelOrderIdNormalized : `BO-${channelOrderIdNormalized}`;
    // Match robustly: by AWB first, then by Shiprocket shipment id, then by short order id (BO-xxxxxx).
    const matchWhere = {
      OR: [
        ...(awb ? [{ awbCode: String(awb) }] : []),
        ...(shipmentIdNormalized ? [{ shiprocketOrderId: shipmentIdNormalized }] : []),
        ...(shipmentIdNormalized ? [{ shortOrderId: shipmentIdNormalized }, { shortOrderId: shortOrderIdFromShipmentId }] : []),
        ...(channelOrderIdNormalized ? [{ shortOrderId: channelOrderIdNormalized }, { shortOrderId: shortOrderIdFromChannelId }] : []),
      ],
    };
    const matchedOrders = await prisma.order.findMany({
      where: matchWhere,
      select: { id: true, status: true, shipmentMeta: true }
    });

    if (matchedOrders.length === 0) {
      console.warn('[EXTERNAL WEBHOOK] No order matched webhook payload identifiers', {
        awb: awb || null,
        shipmentId: shipmentId || null,
        channelOrderId: channelOrderId || null,
        status: current_status,
      });
      return NextResponse.json({ success: true, warning: 'No matching order found' }, { status: 200 });
    }

    for (const order of matchedOrders) {
      const existingMeta = order.shipmentMeta && typeof order.shipmentMeta === 'object' && !Array.isArray(order.shipmentMeta)
        ? (order.shipmentMeta as Record<string, unknown>)
        : {};
      const existingEvents = Array.isArray(existingMeta.events) ? existingMeta.events : [];
      const eventEntry = {
        source: 'shiprocket_webhook',
        receivedAt: new Date().toISOString(),
        previousStatus: order.status,
        normalizedStatus: internalStatus,
        rawStatus: current_status,
        awb: awb || null,
        shipmentId: shipmentId || null,
        payload,
      };

      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: internalStatus,
            shipmentMeta: {
              ...existingMeta,
              lastWebhookStatus: String(current_status),
              lastWebhookReceivedAt: new Date().toISOString(),
              events: [...existingEvents, eventEntry].slice(-30),
            }
          }
        });
      } catch (persistErr: unknown) {
        const persistMessage = persistErr instanceof Error ? persistErr.message : String(persistErr);
        const missingShipmentMetaColumn =
          persistMessage.includes('Unknown argument `shipmentMeta`') ||
          persistMessage.includes('Unknown arg `shipmentMeta`');
        if (!missingShipmentMetaColumn) {
          throw persistErr;
        }
        await prisma.order.update({
          where: { id: order.id },
          data: { status: internalStatus }
        });
      }
    }

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
