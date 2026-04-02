'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import styles from './page.module.css';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
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
    const items = JSON.parse(localStorage.getItem('bheeshma_cart') || '[]');
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
      localStorage.setItem('bheeshma_cart', JSON.stringify(newCart));
    }
  };

  const removeItem = (productId: string) => {
    const newCart = cartItems.filter(item => item._id !== productId);
    setCartItems(newCart);
    localStorage.setItem('bheeshma_cart', JSON.stringify(newCart));
    toast.info("Item removed from cart");
    if (newCart.length === 0) {
      // Do nothing, UI will gracefully render the empty cart state natively
    }
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
            price: item.price
          })),
          totalAmount: totalAmount,
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
            handler: async function (response: any) {
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
                
                const verifyData = await verifyRes.json();
                
                if (verifyRes.ok) {
                  localStorage.removeItem('bheeshma_cart');
                  toast.success('Secure Payment Confirmed! Redirecting...');
                  router.replace(`/track?id=${formData.phone}`);
                } else {
                  toast.error('Payment Verification Failed: ' + verifyData.error);
                }
              } catch (e) {
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

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            toast.error('Payment Failed: ' + response.error.description);
          });
          rzp.open();
        } else {
          localStorage.removeItem('bheeshma_cart');
          toast.success('Order Placed Successfully! Redirecting...');
          router.replace(`/track?id=${formData.phone}`);
        }
      } else {
        toast.error('Payment / Order Failed: ' + data.error);
      }
    } catch (err) {
      toast.error('Error connecting to secure backend servers.');
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
          <p style={{ color: '#64748b', fontSize: '1.15rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>Looks like you haven't added anything yet. Discover our premium herbal wellness collection today.</p>
          <button
            onClick={() => router.push('/products')}
            style={{ width: '100%', padding: '18px', background: 'var(--color-tertiary)', color: 'white', borderRadius: '16px', fontWeight: '800', border: 'none', cursor: 'pointer', fontSize: '1.15rem', transition: 'all 0.3s', boxShadow: '0 10px 25px rgba(255, 152, 0, 0.3)' }}
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
              <span>Total</span>
              <span style={{ color: 'var(--color-tertiary)' }}>₹{totalAmount}</span>
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
                <div style={{ display: 'flex', gap: '15px', gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="paymentMethod" value="Cash" checked={formData.paymentMethod === 'Cash'} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} />
                    Cash on Delivery
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" name="paymentMethod" value="Razorpay" checked={formData.paymentMethod === 'Razorpay'} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} />
                    Pay Online
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
    </div>
  );
}
