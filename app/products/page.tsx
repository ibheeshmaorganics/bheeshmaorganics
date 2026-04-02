import prisma from '@/lib/db';
import ClientProductGrid from './ClientProductGrid';

export const revalidate = 5;

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
    variants: Array.isArray(p.variants) ? p.variants : []
  }));

  return <ClientProductGrid products={products} />;
}
