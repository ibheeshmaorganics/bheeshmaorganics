import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { orderId, weight } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'No order provided' }, { status: 400 });
    }

    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      return NextResponse.json({ error: 'Shiprocket credentials missing from server environment' }, { status: 500 });
    }

    // 1. Authenticate with Shiprocket automatically
    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const authData = await authRes.json();
    if (!authRes.ok || !authData.token) {
      throw new Error(`Shiprocket Auth Failed: ${authData.message || 'Invalid config'}`);
    }
    const token = authData.token;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
    const deliveryPincode = address.pinCode || '111111';
    const pickupPincode = process.env.SHIPROCKET_PICKUP_PIN || '522501';
    const isCod = order.paymentStatus === 'cod' || order.paymentStatus?.toLowerCase().includes('cod') ? 1 : 0;
    
    // Check Serviceability
    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&cod=${isCod}&weight=${weight}&declared_value=${order.totalAmount}`;
    const servRes = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const servData = await servRes.json();
    
    if (!servRes.ok || !servData.data) {
       return NextResponse.json({ error: servData.message || 'Serviceability check failed or unserviceable pincode' }, { status: 400 });
    }

    let couriers = servData.data.available_courier_companies || [];
    
    // Sort logic to present fastest/cheapest logically
    couriers = couriers.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate));

    const mappedCouriers = couriers.map((c: any) => ({
      id: c.courier_company_id,
      name: c.courier_name,
      rate: c.rate,
      edd: c.etd,
      rating: c.rating
    }));
    
    return NextResponse.json({ couriers: mappedCouriers });

  } catch (error: any) {
    console.error('Shiprocket Serviceability Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
