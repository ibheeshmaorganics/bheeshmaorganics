import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import dynamicImport from 'next/dynamic';

const ClientAdminDashboard = dynamicImport(() => import('./ClientAdminDashboard'));

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  
  if (!token || !token.value) {
    redirect('/admin/login');
  }

  const rawProducts = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      subHeading: true,
      description: true,
      price: true,
      discount: true,
      quantity: true,
      unit: true,
      images: true,
      inStock: true,
      createdAt: true,
      variants: true,
    }
  });

  const rawOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      shortOrderId: true,
      customerName: true,
      phone: true,
      email: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentId: true,
      refundId: true,
      refundStatus: true,
      refundFailureReason: true,
      refundInitiatedAt: true,
      refundCompletedAt: true,
      refundTimeline: true,
      address: true,
      products: true,
      status: true,
      totalAmount: true,
      createdAt: true,
      awbCode: true,
      courierName: true,
      trackingLink: true,
      razorpayOrderId: true,
      shiprocketOrderId: true,
      transactionSummary: true,
    }
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
