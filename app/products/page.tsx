import prisma from '@/lib/db';
import ClientProductGrid from './ClientProductGrid';
import { Prisma } from '@prisma/client';
import { type VariantOption } from '@/lib/product-variants';

export const revalidate = 5;

function normalizeVariants(variants: Prisma.JsonValue | null): VariantOption[] {
  if (!Array.isArray(variants)) return [];

  return variants
    .map((variant) => {
      if (!variant || typeof variant !== 'object') return null;
      const maybeSize = 'size' in variant ? variant.size : null;
      const maybePrice = 'price' in variant ? variant.price : null;
      if (typeof maybeSize !== 'string' || typeof maybePrice !== 'number') return null;
      return { size: maybeSize, price: maybePrice };
    })
    .filter((variant): variant is VariantOption => variant !== null);
}

export default async function ProductsPage() {
  // Pre-fetching data securely straight from the Server (Server-Side Rendering)
  // This executes on the server instantly before the page is transmitted to the browser, 
  // guaranteeing practically 0ms loading spinners on the user interface.
  const rawProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const products = rawProducts.map(p => ({
    ...p,
    _id: p.id,
    name: p.name,
    category: '100% Organic',
    price: p.price,
    discount: p.discount || 0,
    images: p.images || [],
    inStock: p.inStock,
    createdAt: p.createdAt.toISOString(),
    variants: normalizeVariants(p.variants)
  }));

  return <ClientProductGrid products={products} />;
}
