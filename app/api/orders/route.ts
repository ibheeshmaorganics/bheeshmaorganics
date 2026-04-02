import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';
// import { initiatePayment } from '@/lib/phonepe';
import { createOrderInShiprocket } from '@/lib/shiprocket';

const JWT_SECRET = process.env.JWT_SECRET || 'bheeshma_super_secret_key_2026';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    const orders = await prisma.order.findMany({ 
      where: { paymentStatus: { not: 'draft_intent' } },
      orderBy: { createdAt: 'desc' } 
    });
    const products = await prisma.product.findMany();

    // Map products for quick lookup
    const productMap = products.reduce((acc, p) => {
      acc[p.id] = { ...p, _id: p.id };
      return acc;
    }, {} as Record<string, any>);

    const populatedOrders = orders.map((order) => {
      const orderProducts = Array.isArray(order.products) ? order.products : [];
      const populatedProducts = orderProducts.map((op: any) => {
        const baseId = op.productId ? String(op.productId).slice(0, 36) : '';
        const variantSuffix = op.productId && String(op.productId).length > 36 ? ` (${String(op.productId).slice(37)})` : '';
        const mappedProduct = productMap[baseId];
        return {
          ...op,
          productId: mappedProduct ? { ...mappedProduct, name: mappedProduct.name + variantSuffix } : { _id: op.productId, name: 'Unknown Product' }
        };
      });
      return {
        ...order,
        _id: order.id,
        products: populatedProducts
      };
    });

    return NextResponse.json({ orders: populatedOrders });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orderData = {
      customerName: body.customerName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      products: body.products,
      totalAmount: body.totalAmount,
      status: 'Pending',
      paymentMethod: body.paymentMethod || 'Cash',
      paymentStatus: body.paymentMethod === 'Razorpay' ? 'draft_intent' : 'cod',
    };

    const order = await prisma.order.create({
      data: orderData
    });

    if (body.paymentMethod === 'Razorpay') {
      try {
        const Razorpay = require('razorpay');

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
          throw new Error("Razorpay environment variables are missing. Please check your .env file and restart your server.");
        }

        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
          amount: Math.round(body.totalAmount * 100), // amount in smallest currency unit
          currency: "INR",
          receipt: order.id,
        };

        const rzpOrder = await razorpay.orders.create(options);

        if (!rzpOrder || !rzpOrder.id) {
          throw new Error("Failed to create Razorpay Order at Gateway");
        }

        return NextResponse.json({
          success: true,
          orderId: order.id,
          razorpayOrderId: rzpOrder.id,
          amount: options.amount,
        }, { status: 201 });

      } catch (gateErr: any) {
        console.error('Razorpay Init Error:', gateErr);
        return NextResponse.json({ error: 'Gateway Offline: ' + String(gateErr.message || gateErr) }, { status: 400 });
      }
    }

    // Default Cash On Delivery sequence
    return NextResponse.json({
      success: true,
      orderId: order.id,
      message: 'Order created securely without payment redirect.',
    }, { status: 201 });
  } catch (err) {
    console.error('Order POST err:', err);
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    jwt.verify(token, JWT_SECRET);
    const body = await req.json();
    const { orderId, ...updateData } = body;

    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    return NextResponse.json({ success: true, order: { ...updatedOrder, _id: updatedOrder.id } });
  } catch (err) {
    console.error('Order PUT err:', err);
    return NextResponse.json({ error: 'Failed to update order details' }, { status: 400 });
  }
}
