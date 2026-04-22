import prisma from '@/lib/db';
import ClientProductView from './ClientProductView';
import { type VariantOption } from '@/lib/product-variants';
import { Prisma } from '@prisma/client';

export const revalidate = 60;

function normalizeVariants(variants: Prisma.JsonValue | null): VariantOption[] {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants
    .map((variant) => {
      if (!variant || typeof variant !== 'object') return null;
      const maybeSize = 'size' in variant ? variant.size : null;
      const maybePriceRaw = 'price' in variant ? variant.price : null;
      const maybePrice = typeof maybePriceRaw === 'number' ? maybePriceRaw : Number(maybePriceRaw);
      if (typeof maybeSize !== 'string' || !Number.isFinite(maybePrice)) return null;
      return { size: maybeSize, price: maybePrice };
    })
    .filter((variant): variant is VariantOption => variant !== null);
}

export default async function ProductViewWrapper(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params?.id;

  if (!id) {
    return <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#64748b' }}>Invalid Product Link</div>;
  }

  const p = await prisma.product.findUnique({ where: { id } });
  
  if (!p) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#64748b' }}>
        Product not found
      </div>
    );
  }

  // Parse types for client component boundaries safely
  const resolvedProduct = {
    ...p,
    _id: p.id,
    subHeading: p.subHeading || undefined,
    createdAt: p.createdAt.toISOString(),
    variants: normalizeVariants(p.variants),
  };

  return <ClientProductView product={resolvedProduct} />;
}
