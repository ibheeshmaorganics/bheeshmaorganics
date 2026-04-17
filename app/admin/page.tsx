import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import ClientAdminDashboard from './ClientAdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  
  if (!token || !token.value) {
    redirect('/admin/login');
  }

  const rawProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const rawOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const rawVisitors = await prisma.visitor.findMany({
    select: { updatedAt: true }
  });

  const products = rawProducts.map(p => ({
    ...p,
    _id: p.id,
    createdAt: p.createdAt.toISOString()
  }));

  const orders = rawOrders.map(o => ({
    ...o,
    _id: o.id,
    createdAt: o.createdAt.toISOString()
  }));

  const visitors = rawVisitors.map(v => v.updatedAt.toISOString());

  return <ClientAdminDashboard initialProducts={products} initialOrders={orders} initialVisitors={visitors} />;
}
