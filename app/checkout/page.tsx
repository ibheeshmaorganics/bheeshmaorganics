'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import styles from './page.module.css';
import { readCart, writeCart, clearCart, type CartItem } from '@/lib/cart';

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error: {
    description?: string;
  };
};

type RazorpayOptions = {
  key?: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => Promise<void>;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: { color: string };
};

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void) => void;
      open: () => void;
    };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showPopup, setShowPopup] = useState<{status: 'success'|'failed', message: string} | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    pinCode: '',
    paymentMethod: 'Cash',
  });

  useEffect(() => {
    const items = readCart();
    setCartItems(items);
    router.prefetch('/products');
    router.prefetch('/track');
  }, [router]);

  const updateQuantity = (productId: string, delta: number) => {
    const newCart = [...cartItems];
    const idx = newCart.findIndex(item => item._id === productId);
    if (idx > -1) {
      newCart[idx].quantity += delta;
      if (newCart[idx].quantity <= 0) {
        newCart.splice(idx, 1);
        toast.info("Item removed from cart");
      }
      setCartItems(newCart);
      writeCart(newCart);
    }
  };

  const removeItem = (productId: string) => {
    const newCart = cartItems.filter(item => item._id !== productId);
    setCartItems(newCart);
    writeCart(newCart);
    toast.info("Item removed from cart");
    if (newCart.length === 0) {
      // Do nothing, UI will gracefully render the empty cart state natively
    }
  };

  const baseTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const isOnline = formData.paymentMethod === 'Razorpay';
  const discountAmount = isOnline ? Math.round(baseTotal * 0.10) : 0;
  const finalTotalAmount = baseTotal - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      toast.error('Your cart is empty! Please add products before checking out.');
      return router.push('/products');
    }
    setLoading(true);

    try {
      const loadRazorpayCore = () => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          phone: formData.phone,
          email: formData.email,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            pinCode: formData.pinCode,
          },
          products: cartItems.map(item => ({
            productId: item._id,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            image: item.imageUrl || (item.images && item.images[0]) || ''
          })),
          paymentMethod: formData.paymentMethod
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.razorpayOrderId) {
          const resObj = await loadRazorpayCore();
          if (!resObj) {
             toast.error('Razorpay SDK failed to load. Are you offline?');
             return;
          }

          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
            amount: data.amount,
            currency: 'INR',
            name: 'Bheeshma Organics',
            description: 'Order Payment',
            order_id: data.razorpayOrderId,
            handler: async function (response: RazorpaySuccessResponse) {
              setLoading(true); // Prevent UI interactions
              try {
                // Send the securely matched Razorpay tokens back to the server
                const verifyRes = await fetch('/api/orders/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    orderId: data.orderId 
                  })
                });
                
                await verifyRes.json();
                
                if (verifyRes.ok) {
                  clearCart();
                  setShowPopup({status: 'success', message: 'Order Placed Successfully! Thank you.'});
                  setTimeout(() => router.replace(`/track?id=${formData.phone}`), 3000);
                } else {
                  setShowPopup({status: 'failed', message: 'Payment Verification Failed.'});
                  setTimeout(() => router.replace(`/track?id=${formData.phone}`), 3000);
                }
              } catch {
                toast.error('Error verifying payment on server.');
              } finally {
                setLoading(false);
              }
            },
            prefill: {
              name: formData.customerName,
              email: formData.email,
              contact: formData.phone
            },
            theme: { color: '#4CAF50' },
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', async function (response: RazorpayFailureResponse) {
            setShowPopup({status: 'failed', message: 'Payment Failed: ' + response.error.description});
            setTimeout(() => router.replace(`/track?id=${formData.phone}`), 3000);
          });
          rzp.open();
        } else {
          clearCart();
          setShowPopup({status: 'success', message: 'Order Placed Successfully! Thank you.'});
          setTimeout(() => router.replace(`/track?id=${formData.phone}`), 3000);
        }
      } else {
        setShowPopup({status: 'failed', message: 'Order Failed: ' + data.error});
        setTimeout(() => router.replace(`/track?id=${formData.phone}`), 3000);
      }
    } catch {
      setShowPopup({status: 'failed', message: 'Error connecting to secure backend servers.'});
      setTimeout(() => router.replace(`/track?id=${formData.phone}`), 3000);
    } finally {
      if (formData.paymentMethod === 'Cash') {
         setLoading(false);
      } else {
         setTimeout(() => setLoading(false), 2000); 
      }
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className={styles.checkoutContainer} style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', padding: '50px 40px', borderRadius: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.06)', textAlign: 'center', maxWidth: '450px', width: '90%', border: '1px solid rgba(255,255,255,0.6)' }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🛒</div>
          <h2 style={{ fontSize: '2.2rem', color: '#1e293b', fontWeight: '900', marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>Empty Cart!</h2>
          <p style={{ color: '#64748b', fontSize: '1.15rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>Looks like you haven&apos;t added anything yet. Discover our premium herbal wellness collection today.</p>
          <button
            onClick={() => router.push('/products')}
            style={{ display: 'block', width: '100%', padding: '18px', background: 'var(--color-tertiary)', color: 'white', borderRadius: '16px', fontWeight: '800', border: 'none', cursor: 'pointer', fontSize: '1.15rem', transition: 'all 0.3s', boxShadow: '0 10px 25px rgba(255, 152, 0, 0.3)', boxSizing: 'border-box' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Explore Our Collection
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.checkoutContainer}>
      <div className={styles.blobOrange}></div>
      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
        <div style={{ marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
          <Link
            href="/products"
            prefetch={true}
            style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.5)', padding: '10px 24px', borderRadius: '30px', color: '#334155', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>←</span> Back to Store
          </Link>
        </div>
        <motion.div
          className={styles.checkoutCard}
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          {/* Left Side: Order Summary */}
          <div className={styles.orderSummary}>
            <h2 className={styles.summaryTitle} style={{ marginBottom: '20px' }}>Your Cart</h2>

            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
              {cartItems.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Your cart is empty.</p>
              ) : (
                cartItems.map((item, i) => (
                  <div key={i} className={styles.cartItem} style={{ position: 'relative' }}>
                    <img src={item.imageUrl || (item.images && item.images[0]) || '🌿'} alt={item.name} className={styles.itemImage} style={{ alignSelf: 'flex-start', marginTop: '5px' }} />
                    <div className={styles.itemDetails} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ paddingRight: '15px' }}>{item.name}</h4>
                        <button type="button" onClick={() => removeItem(item._id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <button type="button" onClick={() => updateQuantity(item._id, -1)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#334155', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '6px 0 0 6px' }}>-</button>
                          <span style={{ fontSize: '0.9rem', width: '32px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item._id, 1)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-tertiary)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '0 6px 6px 0' }}>+</button>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.totalRow}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                Item Total
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>(Incl. of all taxes)</span>
              </span>
              <span>₹{baseTotal}</span>
            </div>
            {isOnline && (
              <div className={styles.totalRow} style={{ marginTop: '10px', fontSize: '1rem', color: '#16a34a' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  Online Payment Discount (10%)
                </span>
                <span>- ₹{discountAmount}</span>
              </div>
            )}
            <div className={styles.totalRow} style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px', color: 'var(--color-tertiary)', fontSize: '1.4rem' }}>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                Total to Pay Now
                {!isOnline && <span style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '4px', maxWidth: '280px', lineHeight: 1.4 }}>₹99 advance payment securely required for COD orders to confirm shipping. Balance ₹{finalTotalAmount > 99 ? finalTotalAmount - 99 : 0} on delivery.</span>}
              </span>
              <span>{isOnline ? `₹${finalTotalAmount}` : '₹99'}</span>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Checkout</h2>
            <p className={styles.sectionSub}>Complete your highly secure order details below.</p>

            <form onSubmit={handleSubmit}>
              <div className={styles.inputGrid}>
                <h3 className={styles.sectionLabel}>Contact Details</h3>
                <input type="text" placeholder="Full Name" className={`${styles.inputField} ${styles.fullWidth}`} required onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                <input type="tel" placeholder="Phone Number" className={styles.inputField} required onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                <input type="email" placeholder="Email Address" className={styles.inputField} required onChange={e => setFormData({ ...formData, email: e.target.value })} />

                <h3 className={styles.sectionLabel}>Shipping Address</h3>
                <input type="text" placeholder="Door No. / Village / Area" className={`${styles.inputField} ${styles.fullWidth}`} required onChange={e => setFormData({ ...formData, street: e.target.value })} />
                <input type="text" placeholder="City" className={styles.inputField} required onChange={e => setFormData({ ...formData, city: e.target.value })} />
                <input type="text" placeholder="State" className={styles.inputField} required onChange={e => setFormData({ ...formData, state: e.target.value })} />
                <input type="text" placeholder="PIN Code" className={styles.inputField} required onChange={e => setFormData({ ...formData, pinCode: e.target.value })} />
                <h3 className={styles.sectionLabel}>Payment Method</h3>
                <div style={{ display: 'flex', gap: '15px', gridColumn: '1 / -1', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: formData.paymentMethod === 'Cash' ? '#dcfce7' : '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: `2px solid ${formData.paymentMethod === 'Cash' ? '#22c55e' : '#e2e8f0'}`, flex: 1 }}>
                    <input type="radio" name="paymentMethod" value="Cash" checked={formData.paymentMethod === 'Cash'} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold' }}>Cash on Delivery</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>₹99 advance payment required</span>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: formData.paymentMethod === 'Razorpay' ? '#dcfce7' : '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: `2px solid ${formData.paymentMethod === 'Razorpay' ? '#22c55e' : '#e2e8f0'}`, flex: 1 }}>
                    <input type="radio" name="paymentMethod" value="Razorpay" checked={formData.paymentMethod === 'Razorpay'} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold' }}>Pay Online Securely</span>
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 'bold' }}>Get 10% OFF</span>
                    </div>
                  </label>
                </div>
              </div>

              <button type="submit" className={styles.payBtn} disabled={loading}>
                {loading ? 'Processing Securely...' : <>Place Order <span style={{ fontSize: '1.2rem' }}>→</span></>}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 70, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -70, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '0',
                borderRadius: '32px',
                textAlign: 'center',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Dynamic Header Gradient Array */}
              <div style={{
                height: '140px',
                background: showPopup.status === 'success' 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)'
                }}></div>
                
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                  style={{
                    width: '90px',
                    height: '90px',
                    background: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    zIndex: 2
                  }}
                >
                  {showPopup.status === 'success' ? (
                    <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  )}
                </motion.div>
              </div>

              <div style={{ padding: '40px 30px' }}>
                <h2 style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '12px', fontWeight: '900', letterSpacing: '-0.5px' }}>
                  {showPopup.status === 'success' ? 'Order Placed!' : 'Transaction Failed'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '1.05rem', marginBottom: '30px', lineHeight: '1.6', fontWeight: '500' }}>
                  {showPopup.message || (showPopup.status === 'success' 
                    ? 'Your premium herbal products are now being prepared for secured dispatch.' 
                    : 'We could not process your secure transaction. Please verify your details.')}
                </p>
                
                <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', border: '1px solid #e2e8f0' }}>
                   <div style={{ 
                     width: '24px', 
                     height: '24px', 
                     border: `3px solid ${showPopup.status === 'success' ? '#10b981' : '#ef4444'}`, 
                     borderTopColor: 'transparent', 
                     borderRadius: '50%', 
                     animation: 'spin 1s linear infinite' 
                   }}></div>
                   <span style={{ color: '#334155', fontWeight: '700', letterSpacing: '0.5px', fontSize: '0.95rem' }}>
                     Routing securely...
                   </span>
                </div>
              </div>
              <style dangerouslySetInnerHTML={{__html: "@keyframes spin { 100% { transform: rotate(360deg); } }"}} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
