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

function maskPhone(value: string): string {
  if (value.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function maskEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(0, local.length - 2))}@${domain}`;
}

function maskAddress(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  return { masked: true };
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
        phone: maskPhone(order.phone),
        email: maskEmail(order.email),
        address: maskAddress(order.address),
        paymentId: order.paymentId ? `${order.paymentId.slice(0, 6)}...` : null,
        products: normalizeOrderProducts(order.products, cachedProductMap!),
      };
    });

    return NextResponse.json({ orders: populatedOrders });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
