'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import styles from './page.module.css';

interface Order { _id: string; status: string; totalAmount: number; createdAt: string; awbCode?: string; courierName?: string; trackingLink?: string; customerName: string; phone: string; email: string; paymentMethod: string; paymentStatus?: string; paymentId?: string; refundId?: string; address: any; products: any[]; }

function OrderTrackingTimeline({ status, isFailed }: { status: string, isFailed: boolean }) {
  if (isFailed) return null; // Don't show happy path timeline for failed orders

  const steps = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];
  const s = status.toUpperCase();
  
  let currentStep = 0;
  if (['PROCESSING', 'CONFIRMED'].includes(s)) currentStep = 1;
  else if (['READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED'].includes(s)) currentStep = 2;
  else if (['DELIVERED'].includes(s)) currentStep = 3;

  return (
    <div style={{ padding: '20px 5%', display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '20px', marginTop: '10px' }}>
      {/* Background Line */}
      <div style={{ position: 'absolute', top: '28px', left: '12%', right: '12%', height: '3px', background: '#e2e8f0', zIndex: 0 }}></div>
      {/* Progress Line */}
      <div style={{ position: 'absolute', top: '28px', left: '12%', width: `${(currentStep / 3) * 76}%`, height: '3px', background: '#10b981', zIndex: 1, transition: 'width 0.8s ease' }}></div>

      {steps.map((step, i) => {
        const isCompleted = i <= currentStep;
        const isActive = i === currentStep;
        return (
          <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, gap: '8px', width: '25%' }}>
            <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ delay: i * 0.15 }}
               style={{ 
                  width: '20px', height: '20px', borderRadius: '50%', 
                  background: isCompleted ? '#10b981' : 'white', 
                  border: `3px solid ${isCompleted ? '#10b981' : '#cbd5e1'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'
               }}
            >
              {isCompleted && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </motion.div>
            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#059669' : (isCompleted ? '#0f172a' : '#94a3b8') }}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

function OrderItem({ order, idx }: { order: Order; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const [liveRefunds, setLiveRefunds] = useState<any[]>([]);
  const [isFetchingLiveRefunds, setIsFetchingLiveRefunds] = useState(false);

  const isFailed = order.status === 'CANCELLED' || order.status === 'RTO' || order.paymentStatus === 'payment failed';
  const isTransit = ['SHIPPED', 'IN_TRANSIT', 'READY_TO_SHIP'].includes(order.status);
  const isSuccess = order.status === 'DELIVERED';

  useEffect(() => {
    if (expanded && (order.paymentId || order.refundId) && ['refund initiated', 'refunded', 'refund failed'].includes(order.paymentStatus?.toLowerCase() || '')) {
      setIsFetchingLiveRefunds(true);
      const query = order.paymentId ? `paymentId=${order.paymentId}` : `refundId=${order.refundId}`;
      fetch(`/api/orders/refund/status?${query}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setLiveRefunds(d.refunds || []);
        })
        .finally(() => setIsFetchingLiveRefunds(false));
    }
  }, [expanded, order.paymentId, order.refundId, order.paymentStatus]);

  const s = order.status?.toUpperCase() || '';
  let statusText = 'Processing';
  let StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
  
  if (isFailed) {
    statusText = order.paymentStatus === 'payment failed' ? 'Payment Failed' : 'Cancelled';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
  } else if (isSuccess) {
    statusText = 'Delivered';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
  } else if (isTransit) {
    statusText = 'In Transit';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
  }

  const dateStr = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(order.createdAt));
  const mainProduct = order.products && order.products[0];
  const moreItems = order.products ? order.products.length - 1 : 0;
  const itemName = mainProduct ? `${mainProduct.productId?.name || 'Product'} ${moreItems > 0 ? `+${moreItems}` : ''}` : `Order #${order._id.slice(-6).toUpperCase()}`;

  return (
    <motion.div
      className={styles.orderCard}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: idx * 0.1 }}
      style={{ padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
    >
      {/* Header / Summary View */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', padding: '16px', background: expanded ? '#f8fafc' : 'white', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'background 0.2s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '10px', 
              background: isFailed ? '#fee2e2' : isSuccess ? '#dcfce7' : isTransit ? '#dbeafe' : '#fef3c7',
              color: isFailed ? '#dc2626' : isSuccess ? '#16a34a' : isTransit ? '#2563eb' : '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {StatusIcon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{itemName}</h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                {statusText} • {dateStr}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
              <span style={{ opacity: 0.6, fontSize: '0.7rem', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount:</span>
              ₹{order.totalAmount}
            </span>
          </div>
        </div>

        {!expanded && (order.awbCode || order.trackingLink) && !isSuccess && !isFailed && (
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#059669', background: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              {order.status === 'SHIPPED' || order.status === 'IN_TRANSIT' || order.status === 'OUT_FOR_DELIVERY' ? 'In Transit - Tracking active' : 'Ready to Ship'}
           </div>
        )}

        {/* Explicit View Details Action Button */}
        {!expanded ? (
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '6px', paddingTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <span style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>View Details <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '6px', paddingTop: '12px', display: 'flex', justifyContent: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>Hide Details <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}><polyline points="6 9 12 15 18 9"></polyline></svg></span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: 'white' }}
        >
          {/* Animated Timeline Tick Component inline */}
          <OrderTrackingTimeline status={order.status} isFailed={isFailed} />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Order ID</span>
              <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>#{order._id.slice(-8).toUpperCase()}</div>
            </div>
            {(order.awbCode || order.trackingLink) && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Tracking</span>
                {order.trackingLink ? (
                  <div>
                    <a href={order.trackingLink.startsWith('http') ? order.trackingLink : `https://${order.trackingLink}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>Track Order &rarr;</a>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{order.awbCode}</div>
                )}
              </div>
            )}
          </div>

          <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Items</span>
            {order.products?.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i !== order.products.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>{item.quantity}x</span>
                  <span style={{ color: '#475569', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.productId?.name || 'Product'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ opacity: 0.6, fontSize: '0.65rem', marginRight: '4px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>Amount:</span>
                  <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>₹{item.price * item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Shipping To</span>
              <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.4' }}>
                <strong>{order.customerName}</strong><br />
                {order.address?.street}, {order.address?.city}<br />
                {order.address?.state} - {order.address?.pinCode}<br />
                {order.phone}
              </div>
            </div>
            <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Payment</span>
              <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                {order.paymentStatus?.toLowerCase().includes('cod') ? 'Cash on Delivery' : order.paymentStatus === 'paid' ? 'Online - Paid' : order.paymentStatus === 'refunded' ? 'Refunded' : order.paymentStatus === 'payment failed' ? <span style={{ color: '#dc2626' }}>Failed</span> : 'Pending'}
              </div>
              
              {order.paymentStatus?.toLowerCase().includes('cod') && order.totalAmount > 99 && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 600 }}>Advance ₹99 Paid</div>
                  <div style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 800 }}>Due ₹{order.totalAmount - 99}</div>
                </div>
              )}
            </div>
          </div>

          {(order.status === 'CANCELLED' || order.status === 'RTO' || order.paymentStatus === 'payment failed') && (
            <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>
               <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 800 }}>Information</h4>
               {order.paymentStatus === 'payment failed' ? (
                 <p style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b' }}>Payment Failed. If money was deducted, it will be refunded within 7 to 10 working days.</p>
               ) : (
                 <p style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b' }}>
                   {(order.paymentMethod === 'Cash' || order.paymentStatus?.toLowerCase().includes('cod')) 
                     ? 'COD Advance ₹99 is non-refundable.' 
                     : order.status === 'RTO' ? `Refund of ₹${order.totalAmount - 99} applicable.` : `Refund of ₹${order.totalAmount} applicable.` }
                 </p>
               )}
            </div>
          )}

          {/* Real-time Customer Refund Timeline */}
          {liveRefunds.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Refund Information</label>
              {isFetchingLiveRefunds ? (
                 <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Syncing timeline with Razorpay...</p>
              ) : (
                 liveRefunds.map((ref: any, idx: number) => {
                   const statusColors: Record<string, {bg: string, border: string, color: string}> = {
                     processed: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
                     failed: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
                     pending: { bg: '#fdf8e3', border: '#fef08a', color: '#854d0e' },
                   };
                   const theme = statusColors[ref.status] || { bg: '#f8fafc', border: '#e2e8f0', color: '#475569' };

                   return (
                     <div key={idx} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.85rem', fontWeight: 800, color: theme.color, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                           {ref.status === 'processed' ? 'Refunded Success' : ref.status === 'failed' ? 'Refund Failed' : ref.status}
                         </span>
                         <span style={{ fontSize: '0.85rem', fontWeight: 800, color: theme.color, display: 'flex', alignItems: 'center' }}>
                           <span style={{ opacity: 0.75, fontSize: '0.7rem', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Refund Amount:</span>
                           ₹{(ref.amount / 100).toFixed(2)}
                         </span>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: '#475569' }}>
                         <div><strong style={{ opacity: 0.8 }}>Initiated:</strong> {new Date(ref.created_at * 1000).toLocaleString('en-IN')}</div>
                         {ref.status === 'processed' && <div><strong style={{ opacity: 0.8 }}>Processed:</strong> {new Date(ref.created_at * 1000).toLocaleString('en-IN')} (Bank Accepted)</div>}
                         {ref.status === 'failed' && (
                           <div style={{ color: '#991b1b', marginTop: '2px' }}>
                             <strong style={{ opacity: 0.8 }}>Failed Reason:</strong> {ref.error_description || ref.status_details?.reason || 'Bank validation rejected. Please initiate again.'}
                           </div>
                         )}
                         {ref.arn && <div style={{ color: '#0f172a' }}><strong style={{ opacity: 0.8 }}>Bank Ref (ARN):</strong> <span style={{ userSelect: 'all' }}>{ref.arn}</span></div>}
                         {ref.payment_source && (
                           <div style={{ marginTop: '4px', background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '4px' }}>
                             <strong style={{ opacity: 0.8, textTransform: 'capitalize' }}>To {ref.payment_source.method || 'Account'}:</strong>{' '}
                             {ref.payment_source.vpa || ref.payment_source.bank || ref.payment_source.card || ref.payment_source.wallet || 'Original Source'}
                           </div>
                         )}
                         <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>Razorpay Record: {ref.id}</div>
                       </div>
                     </div>
                   );
                 })
              )}
            </div>
          )}

          {/* Fallback Display for Unlinkable Refunds */}
          {liveRefunds.length === 0 && !isFetchingLiveRefunds && order.refundId && ['refund initiated', 'refunded', 'refund failed'].includes(order.paymentStatus?.toLowerCase() || '') && (
             <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <span style={{ display: 'flex', alignItems: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> System Refund Record</span>
               <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Tracker ID: {order.refundId}</span>
               <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#94a3b8' }}>Real-time Gateway timeline currently unavailable.</span>
             </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialId = searchParams.get('id') || '';
  const [query, setQuery] = useState(initialId);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/track?id=${encodeURIComponent(id)}`);
      const contentType = res.headers.get("content-type");
      let data: { error?: string, orders?: Order[] } = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error('Server returned an invalid response. Database might be unreachable.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch tracking data');
      }
      setOrders(data.orders || []);
      if (data.orders?.length === 0) {
        setError('No orders found for this Phone or Email.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch tracking data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchOrders(initialId);
    }
  }, [initialId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(query);
  };

  return (
    <div className={styles.trackPageContainer}>
      <div className={styles.blobOrange}></div>
      <div className={styles.blobGreen}></div>

      <div className={`container ${styles.trackWrapper}`} style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '1.5rem', alignSelf: 'flex-start', width: '100%', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
          <button
            onClick={() => router.push('/products')}
            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.5)', padding: '10px 24px', borderRadius: '30px', color: '#334155', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>←</span> Back to Store
          </button>
        </div>
        <motion.div
          className={styles.trackCard}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 60 }}
        >
          <span className={styles.tag}>Order Status</span>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="text"
              placeholder="Phone Number or Email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.inputField}
              required
            />
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Searching...' : 'Track Package'}
            </button>
          </form>

          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.errorAlert}>{error}</motion.div>}

          <div className={styles.results}>
            {orders.map((order, idx) => (
              <OrderItem key={order._id} order={order} idx={idx} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div>Loading Tracker...</div>}>
      <TrackContent />
    </Suspense>
  );
}
