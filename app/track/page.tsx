'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import styles from './page.module.css';

interface Order { _id: string; status: string; totalAmount: number; createdAt: string; awbCode?: string; courierName?: string; trackingLink?: string; customerName: string; phone: string; email: string; paymentMethod: string; paymentStatus?: string; address: any; products: any[]; }

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
                <div className={styles.orderHeader} style={{ paddingBottom: '0.4rem', marginBottom: '0.4rem', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Order #{order._id.slice(-6).toUpperCase()}</h3>
                  <span className={`${styles.statusBadge} ${styles[order.status.toLowerCase()]}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    {(order.status === 'Pending' || order.status === 'Processing') ? 'Ordered' : order.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: '1.4' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '6px' }}>
                    <div>
                      <strong>{order.customerName}</strong><br />
                      {order.phone} | {order.email}
                    </div>
                    <div>
                      <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}<br />
                      <strong>{order.paymentStatus === 'cod' ? 'Cash on Delivery' : order.paymentStatus === 'paid' ? 'Paid Online' : order.paymentStatus === 'payment failed' ? 'Payment Failed' : 'Payment Processing'}</strong> | <strong style={{ color: 'var(--color-tertiary)' }}>₹{order.totalAmount}</strong>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 6px 0' }}><strong>Shipping:</strong> {order.address?.street}, {order.address?.city}, {order.address?.state} - {order.address?.pinCode}</p>

                  <ul style={{ paddingLeft: '15px', margin: '0 0 8px 0' }}>
                    {order.products?.map((item: any, i: number) => (
                      <li key={i}>{item.quantity}x {item.productId?.name || 'Unknown Product'} (₹{item.price * item.quantity})</li>
                    ))}
                  </ul>

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
