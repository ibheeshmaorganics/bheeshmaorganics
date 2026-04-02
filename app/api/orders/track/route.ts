import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/db';

let cachedProductMap: Record<string, any> | null = null;
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const identifier = searchParams.get('id');

  if (!identifier) {
    return NextResponse.json({ error: 'Please provide phone number or email.' }, { status: 400 });
  }

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const orConditions: any[] = [
      { phone: identifier },
      { email: identifier },
    ];
    
    if (isUUID) {
      orConditions.push({ id: identifier });
    }

    if (!cachedProductMap || Date.now() - lastCacheRefresh > CACHE_TTL_MS) {
      const products = await prisma.product.findMany({ select: { id: true, name: true } });
      cachedProductMap = products.reduce((acc, p) => {
        acc[p.id] = { ...p, _id: p.id };
        return acc;
      }, {} as Record<string, any>);
      lastCacheRefresh = Date.now();
    }

    let orders = await prisma.order.findMany({
      where: { OR: orConditions },
      orderBy: { createdAt: 'desc' },
    });

    const populatedOrders = orders.map((order) => {
      const orderProducts = Array.isArray(order.products) ? order.products : [];
      const populatedProducts = orderProducts.map((op: any) => {
        const baseId = op.productId ? String(op.productId).slice(0, 36) : '';
        const variantSuffix = op.productId && String(op.productId).length > 36 ? ` (${String(op.productId).slice(37)})` : '';
        const mappedProduct = cachedProductMap![baseId];
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
    return NextResponse.json({ orders: [] });
  }
}
