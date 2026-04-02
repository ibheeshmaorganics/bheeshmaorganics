import prisma from '@/lib/db';
import ClientProductView from './ClientProductView';

export const revalidate = 5;

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
    createdAt: p.createdAt.toISOString(),
  };

  return <ClientProductView product={resolvedProduct} />;
}
