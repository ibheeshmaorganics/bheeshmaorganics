'use client';
import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { getFriendlyNetworkMessage } from '@/lib/userFacingErrors';

interface Order { _id: string; shortOrderId?: string; status: string; totalAmount: number; createdAt: string; awbCode?: string; courierName?: string; trackingLink?: string; customerName: string; phone: string; email: string; paymentMethod: string; paymentStatus?: string; paymentId?: string; refundId?: string; refundStatus?: string; refundFailureReason?: string; refundInitiatedAt?: string; refundCompletedAt?: string; refundTimeline?: any[]; transactionSummary?: any; address: any; products: any[]; }

function formatOrderDisplayId(order: Pick<Order, '_id' | 'shortOrderId'>): string {
  const normalizedShortId = String(order.shortOrderId || '').replace(/\s+/g, '').toUpperCase();
  if (normalizedShortId) {
    return normalizedShortId.replace(/^BO-/i, '');
  }
  return order._id.slice(-6).toUpperCase();
}

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
  const paymentMethodLower = (order.paymentMethod || '').toLowerCase();
  const paymentStatusLower = (order.paymentStatus || '').toLowerCase();
  const isCodOrder = paymentMethodLower === 'cash' || paymentMethodLower === 'cod' || paymentStatusLower.includes('cod');
  const isPartialOrder = paymentMethodLower === 'partial';
  const codConvenienceFee = Number(order.transactionSummary?.codConvenienceFee || 0);

  const isFailed = order.status === 'CANCELLED' || order.status === 'RTO' || order.paymentStatus === 'payment failed';
  const isTransit = ['SHIPPED', 'IN_TRANSIT', 'READY_TO_SHIP'].includes(order.status);
  const isSuccess = order.status === 'DELIVERED';

  const s = order.status?.toUpperCase() || '';
  let statusText = 'Placed';
  let statusColor = '#d97706';
  let StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
  
  if (paymentStatusLower === 'refunded') {
    statusText = 'Refunded';
    statusColor = '#16a34a';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
  } else if (paymentStatusLower === 'refund initiated') {
    statusText = 'Refund Initiated';
    statusColor = '#2563eb';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M3 12h18"></path><path d="m8 7-5 5 5 5"></path></svg>;
  } else if (s === 'RTO') {
    statusText = 'Return';
    statusColor = '#b45309';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2"><path d="M3 12h18"></path><path d="m8 7-5 5 5 5"></path></svg>;
  } else if (isFailed) {
    statusText = order.paymentStatus === 'payment failed' ? 'Payment Failed' : 'Cancelled';
    statusColor = '#dc2626';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
  } else if (s === 'FAILED') {
    statusText = 'Failed';
    statusColor = '#dc2626';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
  } else if (s === 'CANCELLED') {
    statusText = 'Cancelled';
    statusColor = '#dc2626';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
  } else if (s === 'CONFIRMED') {
    statusText = 'Confirmed';
    statusColor = '#16a34a';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2"><path d="M20 6 9 17l-5-5"></path></svg>;
  } else if (s === 'NEW' || s === 'DRAFT') {
    statusText = 'Placed';
    statusColor = '#d97706';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
  } else if (isSuccess) {
    statusText = 'Delivered';
    statusColor = '#059669';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
  } else if (isTransit) {
    statusText = 'Confirmed';
    statusColor = '#2563eb';
    StatusIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
  }

  const dateStr = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(order.createdAt));
  const mainProduct = order.products && order.products[0];
  const moreItems = order.products ? order.products.length - 1 : 0;
  const itemName = mainProduct ? `${mainProduct.productId?.name || 'Product'} ${moreItems > 0 ? `+${moreItems}` : ''}` : `Order ${formatOrderDisplayId(order)}`;
  const addr = (order.address && typeof order.address === 'object') ? order.address : {};
  const addressLine1 = String(addr.street || addr.line1 || addr.address || addr.village || '').trim();
  const addressLine2 = [addr.area, addr.landmark].filter(Boolean).join(', ');
  const cityStatePin = [addr.city, addr.state, addr.pinCode || addr.pincode || addr.zip].filter(Boolean).join(' - ').replace(' - ', ', ');
  const fallbackAddress = Object.values(addr).filter(v => typeof v === 'string' && v.trim() !== '').join(', ');
  const shippingAddressText = [addressLine1, addressLine2, cityStatePin].filter(Boolean).join(', ') || fallbackAddress || 'Address not available';
  const dbRefundEvents = (Array.isArray(order.refundTimeline) ? order.refundTimeline : [])
    .filter((event: any) => event && typeof event === 'object')
    .slice()
    .sort((a: any, b: any) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
  const customerRefundEvents = dbRefundEvents
    .filter((event: any) => ['gateway_refund_created', 'gateway_processed', 'gateway_failed'].includes(String(event.stage || '')))
    .map((event: any) => {
      const stage = String(event.stage || '');
      const label =
        stage === 'gateway_refund_created'
          ? 'Refund initiated'
          : stage === 'gateway_processed'
            ? 'Refund completed'
            : 'Refund failed';
      const note =
        stage === 'gateway_refund_created'
          ? 'Your refund request is accepted and sent to bank.'
          : stage === 'gateway_processed'
            ? 'Refund is processed successfully.'
            : 'Bank/gateway rejected this refund. Support team will retry.';
      return {
        label,
        timestamp: event.timestamp,
        amount: typeof event.amount === 'number' ? event.amount : null,
        referenceNumber: String(event.refundId || order.refundId || '').trim(),
        note: event.note && stage === 'gateway_failed' ? String(event.note) : note,
      };
    });
  const latestCustomerRefundEvent = customerRefundEvents.length > 0
    ? customerRefundEvents[customerRefundEvents.length - 1]
    : null;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '10px', 
              background: isFailed ? '#fee2e2' : isSuccess ? '#dcfce7' : isTransit ? '#dbeafe' : '#fef3c7',
              color: isFailed ? '#dc2626' : isSuccess ? '#16a34a' : isTransit ? '#2563eb' : '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {StatusIcon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', lineHeight: 1.35 }}>{itemName}</h3>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                <span style={{ color: statusColor, fontWeight: 700 }}>{statusText}</span>
                {' • '}
                <span style={{ color: '#64748b' }}>{dateStr}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flex: '0 0 auto', marginLeft: 'auto' }}>
            <span style={{ fontWeight: 800, color: '#166534', fontSize: '1rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <span style={{ opacity: 0.75, fontSize: '0.7rem', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Amount:</span>
              ₹{order.totalAmount}
            </span>
          </div>
        </div>

        {!expanded && ['READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes((order.status || '').toUpperCase()) && !isSuccess && !isFailed && (
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
              <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{formatOrderDisplayId(order)}</div>
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
                  <span style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.35', wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.productId?.name || 'Product'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                  <span style={{ opacity: 0.6, fontSize: '0.65rem', marginRight: '4px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>Amount:</span>
                  <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.9rem' }}>₹{item.price * item.quantity}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Shipping To</span>
              <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.5', wordBreak: 'break-word' }}>
                <strong>{order.customerName}</strong><br />
                {shippingAddressText}<br />
                <strong>Mobile:</strong> {order.phone || 'N/A'}<br />
                <strong>Email:</strong> {order.email || 'N/A'}
              </div>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 0, background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Payment</span>
              <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                {isCodOrder ? 'Cash on Delivery' : isPartialOrder ? 'Partial Payment' : order.paymentStatus === 'paid' ? 'Online - Paid' : order.paymentStatus === 'refunded' ? 'Refunded' : order.paymentStatus === 'payment failed' ? <span style={{ color: '#dc2626' }}>Failed</span> : 'Pending'}
              </div>

              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 700 }}>
                  Total <span style={{ color: '#166534', fontWeight: 800 }}>₹{order.totalAmount}</span>
                </div>
                {isPartialOrder ? (
                  <>
                    <div style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>Partially Paid ₹99</div>
                    <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 800 }}>Balance on delivery ₹{Math.max(0, order.totalAmount - 99)}</div>
                  </>
                ) : null}
                {isCodOrder && codConvenienceFee > 0 && (
                  <div style={{ color: '#b45309', fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>
                    Includes COD convenience fee ₹{codConvenienceFee}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(() => {
            let title = 'Information';
            let message = 'Your order is being processed. We will update status as it moves to shipping.';
            let bg = '#eff6ff';
            let border = '#bfdbfe';
            let color = '#1d4ed8';

            if (order.paymentStatus === 'payment failed') {
              title = 'Payment Failed';
              message = 'Your payment did not go through. If any amount was deducted, it is usually reversed by bank in 7 to 10 working days.';
              bg = '#fef2f2';
              border = '#fecaca';
              color = '#991b1b';
            } else if (order.status === 'FAILED') {
              title = 'Order Not Confirmed';
              message = 'This order could not be confirmed because payment was not successful. Fulfillment was not started.';
              bg = '#fef2f2';
              border = '#fecaca';
              color = '#991b1b';
            } else if (order.status === 'CANCELLED') {
              title = 'Order Cancelled';
              if (isPartialOrder) {
                message = 'This order was cancelled. Partial payment refund is applicable and will be processed to original payment source.';
              } else if (isCodOrder) {
                message = 'This COD order was cancelled before delivery. No payment was collected, so no refund is required.';
              } else {
                message = `This prepaid order was cancelled. Refund of ₹${order.totalAmount} is applicable.`;
              }
              bg = '#fef2f2';
              border = '#fecaca';
              color = '#991b1b';
            } else if (order.status === 'RTO') {
              title = 'Order Returned (RTO)';
              if (isPartialOrder) {
                message = 'This partial-payment order returned to origin. Partial payment refund is applicable as per policy.';
              } else if (isCodOrder) {
                message = 'This COD order returned to origin. Since payment is collected at delivery, no refund is required.';
              } else {
                message = `This prepaid order returned to origin. Refund of ₹${Math.max(0, order.totalAmount - 99)} is applicable as per policy.`;
              }
              bg = '#fff7ed';
              border = '#fed7aa';
              color = '#9a3412';
            } else if (order.status === 'DELIVERED') {
              title = 'Delivered';
              message = 'Delivered successfully. For any support or issue, please contact our customer team with this order ID.';
              bg = '#ecfdf5';
              border = '#bbf7d0';
              color = '#166534';
            }

            return (
              <div style={{ background: bg, padding: '12px', borderRadius: '8px', border: `1px solid ${border}` }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color, textTransform: 'uppercase', fontWeight: 800 }}>{title}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color }}>{message}</p>
              </div>
            );
          })()}

          {/* Refund info from DB timeline only */}
          {latestCustomerRefundEvent && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Refund Information</label>
              {(() => {
                const event = latestCustomerRefundEvent;
                const amount = typeof event.amount === 'number' ? `₹${event.amount}` : null;
                const isCompleted = event.label === 'Refund completed';
                const isFailedEvent = event.label === 'Refund failed';
                const bg = isCompleted ? '#ecfdf5' : isFailedEvent ? '#fef2f2' : '#eff6ff';
                const border = isCompleted ? '#bbf7d0' : isFailedEvent ? '#fecaca' : '#bfdbfe';
                const color = isCompleted ? '#166534' : isFailedEvent ? '#991b1b' : '#1d4ed8';
                return (
                  <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{event.label}</div>
                    {event.timestamp && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        Updated: {new Date(event.timestamp).toLocaleString('en-IN')}
                      </div>
                    )}
                    {event.referenceNumber && (
                      <div style={{ fontSize: '0.74rem', color: '#334155', marginTop: '5px', fontWeight: 700 }}>
                        Refund Reference: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{event.referenceNumber}</span>
                      </div>
                    )}
                    {amount && <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '6px', fontWeight: 700 }}>Amount: {amount}</div>}
                    {event.note && <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>{event.note}</div>}
                  </div>
                );
              })()}
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

  const fetchOrders = async (id: string, options?: { silent?: boolean }) => {
    if (!id) return;
    if (!options?.silent) {
      setLoading(true);
      setError('');
    }
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('offline');
      }
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/orders/track?id=${encodeURIComponent(id)}`, { signal: controller.signal });
      window.clearTimeout(timeoutId);
      const contentType = res.headers.get("content-type");
      let data: { error?: string, orders?: Order[] } = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error('Server returned an invalid response.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch tracking data');
      }
      setOrders(data.orders || []);
      if (!options?.silent && data.orders?.length === 0) {
        setError('No orders found for this Phone or Email.');
      }
    } catch (err) {
      if (!options?.silent) {
        if (err instanceof Error && err.message === 'No orders found for this Phone or Email.') {
          setError(err.message);
          return;
        }
        setError(getFriendlyNetworkMessage(err));
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchOrders(initialId);
    }
  }, [initialId]);

  useEffect(() => {
    const activeQuery = query.trim();
    if (!activeQuery || orders.length === 0) return;

    const poll = () => {
      if (!document.hidden) {
        void fetchOrders(activeQuery, { silent: true });
      }
    };
    const handleVisibility = () => {
      if (!document.hidden) {
        void fetchOrders(activeQuery, { silent: true });
      }
    };

    const timer = window.setInterval(poll, 30000);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [query, orders.length]);

  useEffect(() => {
    const hasActiveSearch = query.trim().length > 0 || orders.length > 0;
    if (!hasActiveSearch) return;

    const clearTimer = window.setTimeout(() => {
      setQuery('');
      setOrders([]);
      setError('');
      router.replace('/track');
    }, 5 * 60 * 1000);

    return () => window.clearTimeout(clearTimer);
  }, [query, orders.length, router]);

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
              {loading ? 'Searching...' : 'Track Orders'}
            </button>
          </form>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.errorAlert}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch', width: '100%' }}>
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => fetchOrders(query)}
                  style={{
                    border: 'none',
                    background: '#0f766e',
                    color: 'white',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    minHeight: '42px',
                    padding: '10px 16px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '220px',
                    alignSelf: 'center'
                  }}
                >
                  Retry
                </button>
              </div>
            </motion.div>
          )}

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
