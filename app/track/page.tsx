'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import styles from './page.module.css';

interface Order { _id: string; status: string; totalAmount: number; createdAt: string; awbCode?: string; courierName?: string; trackingLink?: string; customerName: string; phone: string; email: string; paymentMethod: string; paymentStatus?: string; refundId?: string; address: any; products: any[]; }

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
              <motion.div
                key={order._id}
                className={styles.orderCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className={styles.orderHeader} style={{ paddingBottom: '0.4rem', marginBottom: '0.4rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>Order #{order._id.slice(-6).toUpperCase()}</h3>
                  <span style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', borderRadius: '6px', letterSpacing: '0.5px', background: (order.status === 'CANCELLED' || order.status === 'RTO' || order.paymentStatus === 'payment failed') ? '#fee2e2' : ['SHIPPED', 'IN_TRANSIT', 'READY_TO_SHIP'].includes(order.status) ? '#dbeafe' : order.status === 'DELIVERED' ? '#dcfce7' : '#fef3c7', color: (order.status === 'CANCELLED' || order.status === 'RTO' || order.paymentStatus === 'payment failed') ? '#991b1b' : ['SHIPPED', 'IN_TRANSIT', 'READY_TO_SHIP'].includes(order.status) ? '#1e40af' : order.status === 'DELIVERED' ? '#166534' : '#92400e' }}>
                    {(() => {
                      if (order.paymentStatus === 'payment failed') return 'Payment Failed';
                      if (order.paymentStatus === 'draft_intent') return 'Payment Processing';
                      const s = order.status?.toUpperCase() || '';
                      if (s === 'PENDING' || s === 'NEW') return 'Order Placed';
                      if (s === 'PROCESSING' || s === 'CONFIRMED') return 'Order Confirmed';
                      if (s === 'CANCELLED') return 'Order Cancelled';
                      if (s === 'READY_TO_SHIP') return 'Ready to Ship';
                      if (s === 'SHIPPED') return 'Shipped';
                      if (s === 'OUT_FOR_DELIVERY') return 'Out for Delivery';
                      if (s === 'DELIVERY_ATTEMPTED') return 'Delivery Attempted';
                      if (s === 'DELIVERED') return 'Delivered';
                      if (s === 'RTO') return 'Order Cancelled';
                      return order.status.replace(/_/g, ' ');
                    })()}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: '1.4' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '6px' }}>
                    <div>
                      <strong>{order.customerName}</strong><br />
                      {order.phone} | {order.email}
                    </div>
                    <div>
                      <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <p style={{ margin: '0 0 6px 0', marginTop: '10px' }}><strong>Shipping:</strong> {order.address?.street}, {order.address?.city}, {order.address?.state} - {order.address?.pinCode}</p>

                  <p style={{ margin: '8px 0 4px 0' }}><strong>Product Details:</strong></p>
                  <ul style={{ paddingLeft: '15px', margin: '0 0 12px 0' }}>
                    {order.products?.map((item: any, i: number) => (
                      <li key={i}>{item.quantity}x {item.productId?.name || 'Unknown Product'} (₹{item.price * item.quantity})</li>
                    ))}
                  </ul>

                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</span>
                      <span style={{ fontWeight: 800, color: order.paymentStatus?.toLowerCase().includes('cod') ? '#ea580c' : order.paymentStatus === 'refunded' ? '#10b981' : order.paymentStatus === 'refund initiated' ? '#f59e0b' : order.paymentStatus === 'paid' ? '#16a34a' : order.paymentStatus === 'payment failed' ? '#ef4444' : '#1e293b' }}>
                        {order.paymentStatus?.toLowerCase().includes('cod') ? 'Cash on Delivery' : order.paymentStatus === 'refunded' ? 'Refunded (Completed)' : order.paymentStatus === 'refund initiated' ? 'Refund Initiated' : order.paymentStatus === 'paid' ? 'Online Payment (Paid)' : order.paymentStatus === 'payment failed' ? 'Payment Failed' : 'Payment Processing'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Total</span>
                      <span style={{ fontWeight: 800, color: order.paymentStatus === 'paid' ? '#16a34a' : '#1e293b' }}>₹{order.totalAmount}</span>
                    </div>
                    {order.refundId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Refund Ref #</span>
                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.8rem' }}>{order.refundId}</span>
                      </div>
                    )}
                    {order.paymentStatus?.toLowerCase().includes('cod') && order.totalAmount > 99 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#16a34a' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Advance Paid</span>
                          <span style={{ fontWeight: 800 }}>- ₹99</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '10px', borderTop: '2px dashed #cbd5e1', color: '#ef4444', alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '0.5px' }}>DUE ON DELIVERY</span>
                          <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>₹{order.totalAmount - 99}</span>
                        </div>
                      </>
                    )}

                    {(order.status === 'CANCELLED' || order.status === 'RTO') && 
                     order.paymentStatus !== 'payment failed' && 
                     order.paymentStatus !== 'payment processing/pending' && (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Refund Information</h4>
                        
                        {order.status === 'CANCELLED' && (order.paymentMethod !== 'Cash' && !order.paymentStatus?.toLowerCase().includes('cod')) && (
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d', fontWeight: 600 }}>Eligible for Full Refund: ₹{order.totalAmount}</p>
                        )}
                        
                        {order.status === 'RTO' && (order.paymentMethod !== 'Cash' && !order.paymentStatus?.toLowerCase().includes('cod')) && (
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d', fontWeight: 600 }}>Delivery Failed. Refund Eligible: ₹{order.totalAmount - 99} <span style={{ fontWeight: 400 }}>(₹99 courier fee deducted)</span></p>
                        )}
                        
                        {(order.paymentMethod === 'Cash' || order.paymentStatus?.toLowerCase().includes('cod')) && (
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d', fontWeight: 600 }}>COD Advance of ₹99 is Non-Refundable.</p>
                        )}
                      </div>
                    )}

                    {order.paymentStatus === 'payment failed' && (
                      <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                         <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            Payment Failed. No money was deducted.
                         </p>
                      </div>
                    )}
                  </div>

                  {(order.awbCode || order.trackingLink || order.courierName) && (
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                      {order.courierName && <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 4px 0' }}><strong>Courier:</strong> {order.courierName}</p>}
                      {order.awbCode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#475569' }}><strong>ID:</strong> {order.awbCode}</span>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(order.awbCode!); toast.success('Copied'); }}
                            style={{ background: 'none', color: '#2563eb', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'underline', padding: 0 }}
                          >Copy</button>
                        </div>
                      )}
                      {order.trackingLink && (
                        <a
                          href={order.trackingLink.startsWith('http') ? order.trackingLink : `https://${order.trackingLink}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-block', background: '#1e293b', color: 'white', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                        >Click here to track</a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
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
