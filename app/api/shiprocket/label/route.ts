import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getShiprocketToken } from '@/lib/server/shiprocket-auth';

export async function POST(req: Request) {
  try {
    const { orderIds } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders provided for label printing' }, { status: 400 });
    }

    const token = await getShiprocketToken();

    // Get Shiprocket Shipment IDs from DB
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, shiprocketOrderId: { not: null } }
    });

    const shipmentIds = orders.map(o => parseInt(o.shiprocketOrderId as string)).filter(id => !isNaN(id));

    if (shipmentIds.length === 0) {
      return NextResponse.json({ error: 'None of the selected orders have been dispatched via Shiprocket yet.' }, { status: 400 });
    }

    // Generate Label natively
    const labelRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/label', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ shipment_id: shipmentIds })
    });
    
    const labelData = await labelRes.json();

    if (!labelRes.ok || !labelData.label_url) {
      console.error('Label API Error:', labelData);
      return NextResponse.json({ error: `Shiprocket Error: ${labelData.message || labelData.error || 'They may not have AWBs assigned yet.'}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, label_url: labelData.label_url });

  } catch (error: any) {
    console.error('Shiprocket Label Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
