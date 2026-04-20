import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import Razorpay from 'razorpay';
// import { initiatePayment } from '@/lib/phonepe';
import { verifyAdminRequest } from '@/lib/server/auth';
import { createProductMap, normalizeOrderProducts } from '@/lib/server/order-products';
import { Prisma } from '@prisma/client';
import { calculateOnlineDiscount, calculatePayableTotal } from '@/lib/order-pricing';

type CheckoutProductInput = {
  productId?: string;
  quantity?: number;
  image?: string;
};

type SanitizedOrderProduct = {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
};

function getBaseProductId(rawProductId: string): string {
  return rawProductId.slice(0, 36);
}

function getVariantSizeFromProductId(rawProductId: string): string | null {
  if (rawProductId.length <= 37) return null;
  return rawProductId.slice(37);
}

function toVariantList(variants: Prisma.JsonValue | null): Array<{ size: string; price: number }> {
  if (!Array.isArray(variants)) return [];

  return variants
    .map((variant) => {
      if (!variant || typeof variant !== 'object') return null;
      const maybeSize = 'size' in variant ? variant.size : null;
      const maybePrice = 'price' in variant ? variant.price : null;
      if (typeof maybeSize !== 'string' || typeof maybePrice !== 'number') return null;
      return { size: maybeSize, price: maybePrice };
    })
    .filter((variant): variant is { size: string; price: number } => variant !== null);
}

function getUnitPriceForProduct(
  product: { price: number; discount: number; quantity: number; unit: string; variants: Prisma.JsonValue | null },
  rawProductId: string
): number {
  const defaultSize = `${product.quantity || 1} ${product.unit || 'kg'}`;
  const selectedSize = getVariantSizeFromProductId(rawProductId) || defaultSize;
  const variants = [{ size: defaultSize, price: Number(product.price) }, ...toVariantList(product.variants)];
  const matchedVariant = variants.find((variant) => variant.size === selectedSize) || variants[0];
  const basePrice = Number(matchedVariant.price);
  if (!product.discount || product.discount <= 0) {
    return basePrice;
  }
  return Math.round(basePrice - (basePrice * product.discount / 100));
}

async function buildSanitizedOrderProducts(rawProducts: unknown): Promise<{ products: SanitizedOrderProduct[]; subtotalAmount: number }> {
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    throw new Error('Products are required.');
  }

  const parsedInputs: CheckoutProductInput[] = rawProducts.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid product payload.');
    }
    return item as CheckoutProductInput;
  });

  const productIds = parsedInputs.map((item) => String(item.productId || ''));
  if (productIds.some((id) => id.length < 36)) {
    throw new Error('Invalid product id in payload.');
  }

  const baseIds = [...new Set(productIds.map(getBaseProductId))];
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: baseIds } },
    select: {
      id: true,
      name: true,
      price: true,
      discount: true,
      quantity: true,
      unit: true,
      images: true,
      variants: true,
    },
  });

  const dbProductMap = new Map(dbProducts.map((product) => [product.id, product]));

  const sanitizedProducts = parsedInputs.map((item, idx) => {
    const rawProductId = String(item.productId);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('Invalid quantity in payload.');
    }

    const baseId = getBaseProductId(rawProductId);
    const product = dbProductMap.get(baseId);
    if (!product) {
      throw new Error('One or more products do not exist.');
    }

    const unitPrice = getUnitPriceForProduct(product, rawProductId);
    return {
      productId: rawProductId,
      quantity,
      price: unitPrice,
      name: product.name,
      image: typeof item.image === 'string' && item.image.length > 0 ? item.image : product.images[0] || '',
    };
  });

  const subtotalAmount = sanitizedProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { products: sanitizedProducts, subtotalAmount };
}

export async function GET(req: NextRequest) {
  try {
    verifyAdminRequest(req);
    const orders = await prisma.order.findMany({ 
      where: { paymentStatus: { not: 'draft_intent' } },
      orderBy: { createdAt: 'desc' } 
    });
    const products = await prisma.product.findMany({ select: { id: true, name: true } });
    const productMap = createProductMap(products);

    const populatedOrders = orders.map((order) => {
      return {
        ...order,
        _id: order.id,
        products: normalizeOrderProducts(order.products, productMap),
      };
    });

    return NextResponse.json({ orders: populatedOrders });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paymentMethod = body.paymentMethod === 'Razorpay' ? 'Razorpay' : 'Cash';
    const { products: sanitizedProducts, subtotalAmount } = await buildSanitizedOrderProducts(body.products);
    const onlineDiscountAmount = calculateOnlineDiscount(subtotalAmount, paymentMethod);
    const totalAmount = calculatePayableTotal(subtotalAmount, paymentMethod);

    const orderData = {
      customerName: body.customerName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      products: sanitizedProducts,
      totalAmount,
      status: 'Pending',
      paymentMethod,
      paymentStatus: paymentMethod === 'Razorpay' ? 'draft_intent' : 'cod',
    };

    const order = await prisma.order.create({ data: orderData });
    if (paymentMethod === 'Razorpay' || paymentMethod === 'Cash') {
      try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
          throw new Error("Razorpay environment variables are missing. Please check your .env file and restart your server.");
        }

        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // For COD, advance payment is 99 rupees
        const payAmount = paymentMethod === 'Cash' ? 99 : totalAmount;

        const options = {
          amount: Math.round(payAmount * 100), // amount in paise
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
          subtotalAmount,
          discountAmount: onlineDiscountAmount,
          payableAmount: totalAmount,
        }, { status: 201 });

      } catch (gateErr: unknown) {
        const gatewayError = gateErr instanceof Error ? gateErr.message : String(gateErr);
        console.error('Razorpay Init Error:', gateErr);
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {
          console.error('Failed to delete draft order after gateway init failure', order.id);
        });
        return NextResponse.json({ error: `Gateway Offline: ${gatewayError}` }, { status: 400 });
      }
    }

    // Fallback if somehow neither Cash nor Razorpay is sent
    return NextResponse.json({
      success: true,
      orderId: order.id,
      subtotalAmount,
      discountAmount: onlineDiscountAmount,
      payableAmount: totalAmount,
      message: 'Order created securely without payment redirect.',
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
    console.error('Order POST err:', err);
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    verifyAdminRequest(req);
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
