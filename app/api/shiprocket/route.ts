import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

let shiprocketTokenCache: { token: string; expiresAt: number } | null = null;

async function getShiprocketToken(email: string, password: string): Promise<string> {
  const now = Date.now();
  if (shiprocketTokenCache && shiprocketTokenCache.expiresAt > now) {
    return shiprocketTokenCache.token;
  }

  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const authData = await authRes.json();
  if (!authRes.ok || !authData.token) {
    throw new Error(`Shiprocket Auth Failed: ${authData.message || 'Invalid Email/Password configuration'}`);
  }

  // Keep a safety buffer so we refresh before token expiry.
  shiprocketTokenCache = {
    token: authData.token,
    expiresAt: now + (9 * 60 * 1000)
  };
  return authData.token;
}

export async function POST(req: Request) {
  try {
    const { orderIds, dimensions, pickupDate, courierId, selectedCourier } = await req.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      return NextResponse.json({ error: 'Shiprocket credentials missing from server environment (.env feels empty)' }, { status: 500 });
    }

    // 1. Reuse cached token when available.
    const token = await getShiprocketToken(email, password);

    const generatedAWBs = [];
    const failedAWBs = [];
    const pickupJobs: Promise<void>[] = [];

    // 2. Loop through and dispatch each selected Admin order
    for (const id of orderIds) {
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) continue;

      let products = [];
      try {
        products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
      } catch (e) {
        products = [];
      }

      let address: any = {};
      try {
        address = typeof order.address === 'string' ? JSON.parse(order.address) : order.address;
      } catch (e) { }

      // Calculate Payment Mode accurately to sync with Shiprocket API standards
      const isCod = order.paymentStatus === 'cod' || order.paymentStatus?.toLowerCase().includes('cod');
      const srPaymentMethod = isCod ? 'COD' : 'Prepaid';

      // Compile Order items logically
      const orderItems = products.map((p: any) => ({
        name: p.productId?.name || 'Bheeshma Organics Assorted Products',
        sku: p.productId?.id || 'SKU-BO-001',
        units: p.quantity || 1,
        selling_price: Math.max(1, p.price || 0),
        discount: p.discount || 0
      }));

      // Safety placeholder if cart format error
      if (orderItems.length === 0) {
        orderItems.push({ name: 'Bheeshma Organics Product', sku: 'SKU-001', units: 1, selling_price: order.totalAmount, discount: 0 });
      }

      // 3. Dispatch & Create Order in Shiprocket
      const srOrderPayload = {
        order_id: `BO-${order.id.slice(-6)}-${Date.now().toString().slice(-4)}`,
        order_date: new Date(order.createdAt).toISOString().split('T')[0],
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary', // Must match their Shiprocket Primary Pickup Location Name
        billing_customer_name: order.customerName,
        billing_last_name: 'Customer', // SR explicitly requires a last name space
        billing_address: address?.street || 'N/A',
        billing_city: address?.city || 'N/A',
        billing_pincode: address?.pinCode || '111111',
        billing_state: address?.state || 'N/A',
        billing_country: 'India',
        billing_email: order.email || 'support@bheeshmaorganics.com',
        billing_phone: order.phone || '9999999999',
        shipping_is_billing: true,
        order_items: orderItems,
        payment_method: srPaymentMethod,
        sub_total: order.totalAmount,
        length: parseFloat(dimensions?.length) || 10,
        breadth: parseFloat(dimensions?.width) || 10,
        height: parseFloat(dimensions?.height) || 10,
        weight: parseFloat(dimensions?.weight) || 1
      };

      const createOrderRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(srOrderPayload)
      });
      const createOrderData = await createOrderRes.json();

      if (!createOrderRes.ok || !createOrderData.shipment_id) {
        console.error(`Shiprocket Create Order Error for ${id}:`, createOrderData);
        continue;
      }

      const shipmentId = createOrderData.shipment_id;
      let srAwb = `SR-Processing-${shipmentId}`;
      let srCourier = 'Shiprocket Partner';
      let trackingLink = `https://shiprocket.co/tracking/${shipmentId}`;

      // 4. Force AWB Generation to seal the package instantly
      try {
        const awbRes = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            shipment_id: shipmentId,
            ...(courierId && courierId !== '0' && courierId !== '' ? { courier_id: Number(courierId) } : {})
          })
        });
        const awbData = await awbRes.json();
        
        let awbCode = awbData.response?.data?.awb_code;

        // Shiprocket often returns 200 OK but sets status to 0 for logic failures
        if (!awbRes.ok || awbData.awb_assign_status === 0 || !awbCode) {
          const nestedErr = awbData.response?.data?.message || JSON.stringify(awbData.response?.data || awbData);
          const errMsg = awbData.message || nestedErr || 'Failed to auto-assign Courier (Check wallet balance or serviceability)';
          failedAWBs.push({ orderId: id, reason: `Shiprocket Refused AWB: ${(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)).substring(0, 100)}` });
          continue; // Halt completely. Do not mark as Shipped!
        }

        srAwb = awbCode;
        srCourier = awbData.response?.data?.courier_name || srCourier;
        trackingLink = `https://shiprocket.co/tracking/${srAwb}`; // Upgraded tracking URL

      } catch (e: any) {
        failedAWBs.push({ orderId: id, reason: e.message || 'System error generating AWB.' });
        continue;
      }

      try {
        // 5. Real-time Native Database Sync
        await prisma.order.update({
          where: { id: id },
          data: {
            status: 'READY_TO_SHIP',
            awbCode: srAwb,
            courierName: srCourier,
            trackingLink: trackingLink,
            shiprocketOrderId: shipmentId.toString(),
            shipmentMeta: {
              dimensions: {
                length: Number(dimensions?.length) || null,
                width: Number(dimensions?.width) || null,
                height: Number(dimensions?.height) || null,
                weight: Number(dimensions?.weight) || null,
              },
              pickupDate: pickupDate || null,
              selectedCourier: selectedCourier || (courierId ? { id: Number(courierId) } : null),
              awb: srAwb,
              assignedCourierName: srCourier,
              trackingLink,
              shiprocketShipmentId: shipmentId.toString(),
              updatedAt: new Date().toISOString(),
            }
          }
        });
        generatedAWBs.push({ orderId: id, awb: srAwb, courier: srCourier, link: trackingLink, srShipmentId: shipmentId });

        // Schedule pickup asynchronously; do not block AWB response.
        const chosenDate = pickupDate ? new Date(pickupDate) : new Date();
        const dateString = chosenDate.toISOString().split('T')[0];
        const pickupJob = fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/pickup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            shipment_id: [shipmentId],
            pickup_date: typeof dateString === 'string' ? [dateString] : []
          })
        })
          .then(async (pickupRes) => {
            const pickupData = await pickupRes.json().catch(() => null);
            await prisma.order.update({
              where: { id },
              data: {
                shipmentMeta: {
                  dimensions: {
                    length: Number(dimensions?.length) || null,
                    width: Number(dimensions?.width) || null,
                    height: Number(dimensions?.height) || null,
                    weight: Number(dimensions?.weight) || null,
                  },
                  pickupDate: pickupDate || null,
                  selectedCourier: selectedCourier || (courierId ? { id: Number(courierId) } : null),
                  awb: srAwb,
                  assignedCourierName: srCourier,
                  trackingLink,
                  shiprocketShipmentId: shipmentId.toString(),
                  pickup: {
                    requested: true,
                    success: pickupRes.ok,
                    statusCode: pickupRes.status,
                    response: pickupData,
                  },
                  updatedAt: new Date().toISOString(),
                }
              }
            }).catch((persistErr) => {
              console.error(`Failed to persist pickup metadata for ${id}:`, persistErr);
            });
          })
          .catch((pickupErr) => {
            console.error(`Pickup scheduling failed for shipment ${shipmentId}:`, pickupErr);
          });
        pickupJobs.push(pickupJob);
      } catch (dbErr) {
        console.error('Database Sync Post-Shipment failed:', dbErr);
      }
    }

    if (failedAWBs.length > 0 && generatedAWBs.length === 0) {
      return NextResponse.json({ error: failedAWBs[0].reason }, { status: 400 });
    }

    // Fire-and-forget completion logging for async pickup calls.
    void Promise.allSettled(pickupJobs).then((results) => {
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.error(`Pickup scheduling failed for ${failedCount} shipment(s).`);
      }
    });

    return NextResponse.json({ success: true, processed: generatedAWBs.length, details: generatedAWBs, failures: failedAWBs, pickupScheduledAsync: true });

  } catch (error: any) {
    console.error('Core Shiprocket API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
