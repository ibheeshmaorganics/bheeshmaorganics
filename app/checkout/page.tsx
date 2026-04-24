'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import styles from './page.module.css';
import { readCart, writeCart, clearCart, type CartItem } from '@/lib/cart';
import { getFriendlyNetworkMessage, getFriendlyOrderError } from '@/lib/userFacingErrors';

type ProductVariant = { size: string; price: number };
type ProductRecord = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  discount?: number;
  quantity?: number;
  unit?: string;
  images?: string[];
  imageUrl?: string;
  variants?: ProductVariant[];
};

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
  const orderTypeSectionRef = useRef<HTMLHeadingElement | null>(null);
  const orderSummaryRef = useRef<HTMLDivElement | null>(null);
  const payButtonRef = useRef<HTMLButtonElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showPopup, setShowPopup] = useState<{status: 'success'|'failed', message: string} | null>(null);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    pinCode: '',
    orderType: '',
  });

  const getBaseProductId = (rawId: string) => rawId.slice(0, 36);

  const getVariantSizeFromCartId = (rawId: string): string | null => {
    if (!rawId || rawId.length <= 37) return null;
    return rawId.slice(37);
  };

  const resolveLatestPrice = (product: ProductRecord, cartId: string) => {
    const defaultSize = `${product.quantity || 1} ${product.unit || 'kg'}`;
    const selectedSize = getVariantSizeFromCartId(cartId) || defaultSize;
    const variants = [
      { size: defaultSize, price: Number(product.price) || 0 },
      ...((product.variants || []).map((variant) => ({
        size: variant.size,
        price: Number(variant.price) || 0
      })))
    ];
    const matchedVariant = variants.find((variant) => variant.size === selectedSize) || variants[0];
    const basePrice = Number(matchedVariant.price) || 0;
    const discount = Number(product.discount) || 0;
    return discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
  };

  const syncCartWithLatestProducts = async (sourceItems: CartItem[]) => {
    if (!sourceItems.length) return sourceItems;

    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (!res.ok) return sourceItems;
      const data = await res.json();
      if (!data?.products || !Array.isArray(data.products)) return sourceItems;

      const productMap = new Map<string, ProductRecord>();
      (data.products as ProductRecord[]).forEach((product) => {
        const pid = String(product._id || product.id || '');
        if (pid) productMap.set(pid, product);
      });

      let hasChanges = false;
      const syncedItems = sourceItems
        .map((item) => {
          const baseProductId = item.productIdOriginal
            ? String(item.productIdOriginal)
            : getBaseProductId(String(item._id || ''));
          const latestProduct = productMap.get(baseProductId);
          if (!latestProduct) {
            hasChanges = true;
            return null;
          }

          const latestPrice = resolveLatestPrice(latestProduct, String(item._id || ''));
          const selectedSize = getVariantSizeFromCartId(String(item._id || ''));
          const latestName = selectedSize ? `${latestProduct.name} - ${selectedSize}` : latestProduct.name;
          const latestImage = latestProduct.imageUrl || (latestProduct.images && latestProduct.images[0]) || item.imageUrl || '';

          const updatedItem: CartItem = {
            ...item,
            name: latestName,
            price: latestPrice,
            imageUrl: latestImage,
            images: latestProduct.images || item.images || [],
          };

          if (updatedItem.name !== item.name || updatedItem.price !== item.price || updatedItem.imageUrl !== item.imageUrl) {
            hasChanges = true;
          }
          return updatedItem;
        })
        .filter((item): item is CartItem => Boolean(item))
        .filter((item) => (Number(item.price) || 0) > 0);

      if (hasChanges) {
        setCartItems(syncedItems);
        writeCart(syncedItems);
      }
      return syncedItems;
    } catch {
      return sourceItems;
    }
  };

  useEffect(() => {
    const items = readCart();
    setCartItems(items);
    void syncCartWithLatestProducts(items);
    router.prefetch('/products');
    router.prefetch('/track');
  }, [router]);

  useEffect(() => {
    const handleFocus = () => {
      if (document.hidden) return;
      const latestLocalCart = readCart();
      setCartItems(latestLocalCart);
      void syncCartWithLatestProducts(latestLocalCart);
    };

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const latestLocalCart = readCart();
      void syncCartWithLatestProducts(latestLocalCart);
    }, 5000);

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const updateQuantity = (productId: string, delta: number) => {
    const newCart = [...cartItems];
    const idx = newCart.findIndex(item => item._id === productId);
    if (idx > -1) {
      newCart[idx].quantity += delta;
      if (newCart[idx].quantity <= 0) {
        newCart.splice(idx, 1);
      }
      setCartItems(newCart);
      writeCart(newCart);
    }
  };

  const removeItem = (productId: string) => {
    const newCart = cartItems.filter(item => item._id !== productId);
    setCartItems(newCart);
    writeCart(newCart);
    if (newCart.length === 0) {
      // Do nothing, UI will gracefully render the empty cart state natively
    }
  };

  const baseTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const isPayFull = formData.orderType === 'PAY_FULL';
  const isPartial = formData.orderType === 'PARTIAL';
  const isCod = formData.orderType === 'COD';
  const hasSelectedOrderType = isPayFull || isPartial || isCod;
  const fullPaymentDiscountAmount = Math.round(baseTotal * 0.10);
  const discountAmount = isPayFull ? fullPaymentDiscountAmount : 0;
  const codConvenienceFee = isCod ? 50 : 0;
  const payableTotal = Math.max(0, baseTotal - discountAmount + codConvenienceFee);
  const payNowAmount = isPayFull ? payableTotal : isPartial ? Math.min(99, payableTotal) : 0;
  const payLaterAmount = Math.max(0, payableTotal - payNowAmount);
  const isPhoneValid = /^\d{10}$/.test(formData.phone);
  const hasCustomerName = formData.customerName.trim().length > 0;
  const hasEmail = formData.email.trim().length > 0;
  const hasStreet = formData.street.trim().length > 0;
  const hasCity = formData.city.trim().length > 0;
  const hasState = formData.state.trim().length > 0;
  const hasPinCode = formData.pinCode.trim().length > 0;

  const handlePhoneChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: onlyDigits });
  };

  const optimizeCloudinaryDeliveryUrl = (url: string) => {
    if (!url || !url.includes('res.cloudinary.com') || url.includes('/upload/f_auto,q_auto/')) {
      return url;
    }
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  };

  const scrollToPaymentMethodView = () => {
    window.setTimeout(() => {
      const target = orderTypeSectionRef.current || orderSummaryRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 180);
  };

  const handleOrderTypeChange = (orderType: string) => {
    setFormData({ ...formData, orderType });
    window.setTimeout(() => {
      const target = payButtonRef.current || orderSummaryRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
  };

  useEffect(() => {
    if (currentStep !== 2) return;
    scrollToPaymentMethodView();
  }, [currentStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latestItems = await syncCartWithLatestProducts(readCart());
    setCartItems(latestItems);
    setShowFieldErrors(true);
    if (latestItems.length === 0) {
      toast.error('Your cart is empty! Please add products before checking out.');
      return router.push('/products');
    }
    if (!hasCustomerName || !hasEmail || !hasStreet || !hasCity || !hasState || !hasPinCode) {
      toast.error('Please fill all required fields.');
      return;
    }
    if (!isPhoneValid) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!hasSelectedOrderType) {
      toast.error('Please select an order type.');
      scrollToPaymentMethodView();
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setShowPopup({
        status: 'failed',
        message: getFriendlyNetworkMessage(new Error('offline'))
      });
      return;
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

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
          products: latestItems.map(item => ({
            productId: item._id,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            image: item.imageUrl || (item.images && item.images[0]) || ''
          })),
          paymentMethod: formData.orderType === 'PAY_FULL' ? 'Razorpay' : formData.orderType === 'PARTIAL' ? 'Partial' : 'Cash',
          orderType: formData.orderType
        })
      });
      window.clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
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
        const backendError = typeof data?.error === 'string' ? data.error : '';
        setShowPopup({ status: 'failed', message: getFriendlyOrderError(backendError) });
      }
    } catch (err: unknown) {
      setShowPopup({ status: 'failed', message: getFriendlyNetworkMessage(err) });
    } finally {
      if (formData.orderType === 'COD') {
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
      <div className={styles.checkoutShell}>
        <div className={styles.topActions}>
          <Link
            href="/products"
            prefetch={true}
            className={styles.backToStoreBtn}
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
            <h2 className={styles.summaryTitle}>Cart</h2>

            <div className={styles.cartList}>
              {cartItems.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Your cart is empty.</p>
              ) : (
                cartItems.map((item, i) => (
                  <div key={i} className={styles.cartItem}>
                    <Image
                      src={optimizeCloudinaryDeliveryUrl(item.imageUrl || (item.images && item.images[0]) || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=')}
                      alt={item.name}
                      className={styles.itemImage}
                      width={60}
                      height={60}
                    />
                    <div className={styles.itemDetails}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ paddingRight: '15px' }}>{item.name}</h4>
                          <button type="button" onClick={() => removeItem(item._id)} className={styles.removeBtn}>Remove</button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                          <button type="button" onClick={() => updateQuantity(item._id, -1)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#16a34a', color: '#ffffff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>-</button>
                          <span style={{ fontSize: '0.95rem', width: '38px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item._id, 1)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#16a34a', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>+</button>
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
          </div>

          {/* Right Side: Form */}
          <div className={styles.formSection}>
            <div className={styles.progressWrap}>
              <div className={styles.progressHeader}>
                <span>Step {currentStep} of 2</span>
                <span>{currentStep === 1 ? 'Order details' : 'Payment method'}</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: currentStep === 1 ? '50%' : '100%' }}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {currentStep === 1 ? (
                <>
                  <div className={styles.mobileProductDetails}>
                    <div className={styles.mobileProductHeader}>
                      <h3 className={styles.mobileProductTitle}>Product details</h3>
                      <span className={styles.mobileProductCount}>{cartItems.length} item{cartItems.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.mobileProductList}>
                      {cartItems.map((item, i) => (
                        <div key={`mobile-item-${i}`} className={styles.mobileProductItem}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className={styles.mobileProductName}>{item.name}</span>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 700 }}>Qty: {item.quantity}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <strong>₹{item.price * item.quantity}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', borderRadius: '999px', border: '1px solid #cbd5e1', background: '#fff', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
                                <button type="button" onClick={() => updateQuantity(item._id, -1)} style={{ width: '26px', height: '26px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>-</button>
                                <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>{item.quantity}</span>
                                <button type="button" onClick={() => updateQuantity(item._id, 1)} style={{ width: '26px', height: '26px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>+</button>
                              </div>
                              <button type="button" onClick={() => removeItem(item._id)} style={{ border: 'none', background: '#fee2e2', color: '#b91c1c', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', padding: '4px 7px', borderRadius: '999px' }}>Remove</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={styles.mobileProductTotal}>
                      <span>Subtotal</span>
                      <strong>₹{baseTotal}</strong>
                    </div>
                  </div>

                  <div className={styles.inputGrid}>
                    <h3 className={styles.sectionLabel}>Customer details</h3>
                    <input type="text" placeholder="Full Name" value={formData.customerName} className={`${styles.inputField} ${styles.fullWidth}`} onChange={e => setFormData({ ...formData, customerName: e.target.value })} style={showFieldErrors && !hasCustomerName ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' } : undefined} />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phone}
                      className={styles.inputField}
                      
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      title="Enter 10-digit mobile number"
                      onChange={e => handlePhoneChange(e.target.value)}
                      style={showFieldErrors && !isPhoneValid ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' } : undefined}
                    />
                    {showFieldErrors && !isPhoneValid && (
                      <div style={{ marginTop: '-6px', fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>
                        Phone number must be exactly 10 digits.
                      </div>
                    )}
                    <input type="email" placeholder="Email Address" value={formData.email} className={styles.inputField} onChange={e => setFormData({ ...formData, email: e.target.value })} style={showFieldErrors && !hasEmail ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' } : undefined} />

                    <h3 className={styles.sectionLabel}>Address details</h3>
                    <input type="text" placeholder="Door No. / Village / Area" value={formData.street} className={`${styles.inputField} ${styles.fullWidth}`} onChange={e => setFormData({ ...formData, street: e.target.value })} style={showFieldErrors && !hasStreet ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' } : undefined} />
                    <input type="text" placeholder="City" value={formData.city} className={styles.inputField} onChange={e => setFormData({ ...formData, city: e.target.value })} style={showFieldErrors && !hasCity ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' } : undefined} />
                    <input type="text" placeholder="State" value={formData.state} className={styles.inputField} onChange={e => setFormData({ ...formData, state: e.target.value })} style={showFieldErrors && !hasState ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' } : undefined} />
                    <input type="text" placeholder="PIN Code" value={formData.pinCode} className={styles.inputField} onChange={e => setFormData({ ...formData, pinCode: e.target.value })} style={showFieldErrors && !hasPinCode ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.12)' } : undefined} />
                    {showFieldErrors && (!hasCustomerName || !isPhoneValid || !hasEmail || !hasStreet || !hasCity || !hasState || !hasPinCode) && (
                      <div className={styles.fullWidth} style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700 }}>
                        Please fill all required fields correctly.
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.payBtn}
                    onClick={() => {
                      setShowFieldErrors(true);
                      if (!hasCustomerName || !isPhoneValid || !hasEmail || !hasStreet || !hasCity || !hasState || !hasPinCode) {
                        toast.error('Please fill all required fields correctly.');
                        return;
                      }
                      setCurrentStep(2);
                      scrollToPaymentMethodView();
                    }}
                  >
                    Continue to payment method <span style={{ fontSize: '1.2rem' }}>→</span>
                  </button>
                </>
              ) : (
                <>
                  <h3 ref={orderTypeSectionRef} className={styles.sectionLabel} style={{ scrollMarginTop: '110px' }}>Order type</h3>
                  <div className={styles.orderTypeGrid}>
                    <label className={`${styles.orderTypeCard} ${isPayFull ? styles.orderTypeCardActive : ''}`}>
                      <input type="radio" name="orderType" value="PAY_FULL" checked={isPayFull} onChange={e => handleOrderTypeChange(e.target.value)} />
                      <div>
                        <strong>Pay full payment</strong>
                        <span><strong style={{ color: '#166534' }}>₹{fullPaymentDiscountAmount} OFF</strong> on full payment</span>
                      </div>
                    </label>
                    <label className={`${styles.orderTypeCard} ${isPartial ? styles.orderTypeCardActive : ''}`}>
                      <input type="radio" name="orderType" value="PARTIAL" checked={isPartial} onChange={e => handleOrderTypeChange(e.target.value)} />
                      <div>
                        <strong>Partial payment</strong>
                        <span>Pay now <strong style={{ color: '#1d4ed8' }}>₹99</strong>, balance on delivery</span>
                      </div>
                    </label>
                    <label className={`${styles.orderTypeCard} ${isCod ? styles.orderTypeCardActive : ''}`}>
                      <input type="radio" name="orderType" value="COD" checked={isCod} onChange={e => handleOrderTypeChange(e.target.value)} />
                      <div>
                        <strong>Cash on Delivery</strong>
                        <span><strong style={{ color: '#92400e' }}>₹50</strong> convenience fee</span>
                      </div>
                    </label>
                  </div>

                  <div ref={orderSummaryRef} className={styles.summaryBox}>
                    <h4>Order summary</h4>
                    <div><span>Subtotal</span><span>₹{baseTotal}</span></div>
                    <div><span>Shipping</span><span>Free</span></div>
                    {isPayFull && <div><span>Online discount</span><span>- ₹{discountAmount}</span></div>}
                    {isCod && <div><span>COD convenience fee</span><span>+ ₹50</span></div>}
                    <div className={styles.summaryFinal}><span>Total</span><span>₹{payableTotal}</span></div>
                    <div className={styles.summaryPayNow}><span>Pay now</span><span>₹{payNowAmount}</span></div>
                    {isPartial && <div><span>Balance on delivery</span><span>₹{payLaterAmount}</span></div>}
                  </div>

                  <div className={styles.stepActions}>
                    <button type="button" className={styles.secondaryBtn} onClick={() => setCurrentStep(1)}>Back</button>
                    <button ref={payButtonRef} type="submit" className={styles.payBtn} disabled={loading} style={{ marginTop: 0 }}>
                      {loading ? 'Processing Securely...' : <>{!hasSelectedOrderType || isCod ? 'Place order' : 'Pay'} <span style={{ fontSize: '1.2rem' }}>→</span></>}
                    </button>
                  </div>
                </>
              )}
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
                      order status...
                   </span>
                </div>
                {showPopup.status === 'failed' && (
                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowPopup(null)}
                      style={{
                        border: 'none',
                        background: '#0f766e',
                        color: 'white',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        minHeight: '44px',
                        padding: '10px 20px',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: '240px'
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
              <style dangerouslySetInnerHTML={{__html: "@keyframes spin { 100% { transform: rotate(360deg); } }"}} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
