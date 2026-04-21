import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { createProductMap, normalizeOrderProducts } from '@/lib/server/order-products';
import { checkRateLimit } from '@/lib/server/rate-limit';

let cachedProductMap: ReturnType<typeof createProductMap> | null = null;
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getRequestIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const identifier = searchParams.get('id');

  if (!identifier) {
    return NextResponse.json({ error: 'Please provide phone number or email.' }, { status: 400 });
  }

  try {
    const ip = getRequestIp(req);
    const rateKey = `order-track:${ip}:${identifier.toLowerCase()}`;
    const rate = checkRateLimit(rateKey, {
      windowMs: 10 * 60 * 1000,
      max: 20,
      blockDurationMs: 10 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const orConditions: Array<{ phone?: string; email?: string; id?: string }> = [
      { phone: identifier },
      { email: identifier },
    ];
    
    if (isUUID) {
      orConditions.push({ id: identifier });
    }

    if (!cachedProductMap || Date.now() - lastCacheRefresh > CACHE_TTL_MS) {
      const products = await prisma.product.findMany({ select: { id: true, name: true } });
      cachedProductMap = createProductMap(products);
      lastCacheRefresh = Date.now();
    }

    const orders = await prisma.order.findMany({
      where: { 
        OR: orConditions,
        paymentStatus: { not: 'draft_intent' }
      },
      orderBy: { createdAt: 'desc' },
    });

    const populatedOrders = orders.map((order) => {
      return {
        ...order,
        _id: order.id,
        phone: order.phone,
        email: order.email,
        address: order.address,
        paymentId: order.paymentId ? `${order.paymentId.slice(0, 6)}...` : null,
        products: normalizeOrderProducts(order.products, cachedProductMap!),
      };
    });

    return NextResponse.json({ orders: populatedOrders });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
