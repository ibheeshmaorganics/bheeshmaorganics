'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'sonner';

interface Product { _id: string; name: string; category: string; price: number; discount?: number; images?: string[]; imageUrl?: string; description?: string; inStock?: boolean; variants?: any[]; quantity?: number; unit?: string; }

function ProductImageCarousel({ images, name }: { images: string[], name: string }) {
  if (!images || images.length === 0) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🌿</div>;
  if (images.length === 1) return <img src={images[0]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
      <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', width: '100%', height: '100%', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
        {images.map((img, i) => (
          <img key={i} src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', flexShrink: 0, scrollSnapAlign: 'start' }} />
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: '8px', width: '100%', display: 'flex', justifyContent: 'center', gap: '6px', pointerEvents: 'none' }}>
        {images.map((_, i) => (
          <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        ))}
      </div>
    </div>
  );
}

export default function ClientProductGrid({ products: initialProducts }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    // Aggressively pre-warm all product destination pages natively into background memory instantly 
    // ensuring literal 0ms routing transitions matching 'auto fetching' user priorities.
    initialProducts.forEach(p => {
      router.prefetch(`/products/${p._id}`);
    });
  }, [initialProducts, router]);

  // Background auto-fetching running continuously
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();

        if (data && data.products) {
          // Compare strings or just set state, React avoids DOM repaints if data is structurally identical
          setProducts(data.products.map((p: any) => ({
            ...p,
            category: '100% Organic',
            discount: p.discount || 0,
            images: p.images || []
          })));
        }
      } catch {
        // Silently ignore network errors to keep the UI smooth
      }
    }, 5000); // live-fetches exactly every 5 seconds silently

    return () => clearInterval(interval);
  }, []);

  const ITEMS_PER_LOAD = 12;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_LOAD);
  const visibleProducts = products.slice(0, visibleCount);

  // Auto-pagination without buttons (Infinite Scrolling)
  useEffect(() => {
    const handleScroll = () => {
      // Detect if user has scrolled near the bottom of the page (within 600px)
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 600) {
        if (visibleCount < products.length) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_LOAD, products.length));
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [products.length, visibleCount]);

  const [cart, setCart] = useState<any[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem('bheeshma_cart') || '[]'));
  }, []);

  const updateCart = (newCart: any[]) => {
    setCart(newCart);
    localStorage.setItem('bheeshma_cart', JSON.stringify(newCart));
  };

  const handleAddToCart = (product: Product, variantIndex: number = -1) => {
    if (product.inStock === false) return;

    const hasVariants = product.variants && product.variants.length > 0;
    const allVariants = hasVariants
      ? [{ size: `${product.quantity || 1} ${product.unit || 'kg'}`, price: product.price }, ...product.variants!]
      : [{ size: `${product.quantity || 1} ${product.unit || 'kg'}`, price: product.price }];

    const variant = variantIndex >= 0 ? allVariants[variantIndex] : allVariants[0];

    const cartId = `${product._id}-${variant.size}`;
    const displayName = `${product.name} - ${variant.size}`;
    const basePrice = Number(variant.price);

    const finalPrice = product.discount && product.discount > 0
      ? Math.round(basePrice - (basePrice * product.discount / 100))
      : basePrice;

    const existingIdx = cart.findIndex((item: any) => item._id === cartId);

    if (existingIdx > -1) {
      const newCart = [...cart];
      newCart[existingIdx].quantity += 1;
      updateCart(newCart);
    } else {
      updateCart([...cart, { ...product, _id: cartId, name: displayName, price: finalPrice, quantity: 1, originalPrice: basePrice, productIdOriginal: product._id }]);
    }

    toast.success(`${displayName} added to cart!`);
  };

  const updateQuantity = (cartId: string, delta: number) => {
    const existingIdx = cart.findIndex(c => c._id === cartId);
    if (existingIdx === -1) return;
    const newCart = [...cart];
    newCart[existingIdx].quantity += delta;
    if (newCart[existingIdx].quantity <= 0) {
      newCart.splice(existingIdx, 1);
      toast.info(`Removed from cart`);
    }
    updateCart(newCart);
  };

  return (
    <div style={{ minHeight: '80vh', background: 'linear-gradient(180deg, #F8FBF8 0%, #FFFFFF 100%)' }}>
      <div style={{ 
        backgroundImage: 'url(/images/shop_hero_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: 'white', 
        padding: 'clamp(6rem, 10vw, 10rem) 1rem clamp(3rem, 4vw, 4rem) 1rem', 
        textAlign: 'center', 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(16, 42, 28, 0.5)' }}></div>
        <motion.div
          className="container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 4rem)', fontWeight: 800, marginBottom: '1rem', color: 'white', letterSpacing: '-1px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Premium Wellness Collection</h1>
          <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)', color: 'rgba(255, 255, 255, 0.95)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6, textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>Carefully crafted from pure Himalayan sourcing and traditional medicinal wisdom to support your daily holistic health.</p>
        </motion.div>
      </div>

      <div className="container" style={{ padding: 'clamp(2rem, 5vw, 4rem) 1rem', maxWidth: '1300px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .responsiveGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
          }
          @media (min-width: 640px) {
            .responsiveGrid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 1rem;
            }
          }
          @media (min-width: 1024px) {
            .responsiveGrid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 1.5rem;
            }
          }
        `}} />
        <motion.div
          className="responsiveGrid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
        >
          {visibleProducts.map(p => (
            <motion.div
              key={p._id}
              style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0, 0, 0, 0.04)', border: '1px solid rgba(75, 174, 79, 0.1)', display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100vw' }}
              variants={{
                hidden: { opacity: 0, scale: 0.95, y: 20 },
                visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5 } }
              }}
            >
              <div onClick={() => router.push(`/products/${p._id}`)} style={{ cursor: 'pointer', height: 'clamp(140px, 35vw, 220px)', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', borderBottom: '1px solid #eaeaea' }}>
                <ProductImageCarousel images={p.images && p.images.length > 0 ? p.images : (p.imageUrl ? [p.imageUrl] : [])} name={p.name} />
              </div>
              <div style={{ padding: 'clamp(0.6rem, 2vw, 1.25rem)', minWidth: 0 }}>
                <div style={{ display: 'inline-block', background: 'rgba(255, 179, 0, 0.2)', color: 'var(--color-tertiary)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>{p.category}</div>
                {(() => {
                  const hasVariants = p.variants && p.variants.length > 0;
                  const allVariants = hasVariants ? [{ size: `${p.quantity || 1} ${p.unit || 'kg'}`, price: p.price }, ...p.variants!] : [{ size: `${p.quantity || 1} ${p.unit || 'kg'}`, price: p.price }];
                  const vi = selectedVariants[p._id] || 0;
                  const currentBasePrice = Number(allVariants[vi].price);
                  const currentFinalPrice = p.discount && p.discount > 0 ? Math.round(currentBasePrice - (currentBasePrice * p.discount / 100)) : currentBasePrice;
                  const activeCartId = `${p._id}-${allVariants[vi].size}`;

                  return (
                    <>
                      <div onClick={() => router.push(`/products/${p._id}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', width: '100%', marginBottom: '10px' }}>
                        <h3 style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.15rem)', fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize', margin: 0, width: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{p.name}</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', flexShrink: 0, width: '100%' }}>
                          {p.discount && p.discount > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', color: p.inStock === false ? '#94a3b8' : 'var(--color-primary-dark)', fontWeight: 800, lineHeight: 1 }}>
                                ₹{currentFinalPrice}
                              </span>
                              <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.85rem' }}>₹{currentBasePrice}</span>
                              <span style={{ color: '#22c55e', fontSize: 'clamp(0.6rem, 2vw, 0.75rem)', fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{p.discount}% OFF</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 800, color: p.inStock === false ? '#94a3b8' : 'inherit', lineHeight: 1 }}>₹{currentBasePrice}</span>
                          )}
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>(Incl. of all taxes)</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {allVariants.map((v: any, idx: number) => {
                          const isSelected = vi === idx;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [p._id]: idx }))}
                              style={{
                                padding: '4px 10px', fontSize: '0.85rem', fontWeight: 600, borderRadius: '4px', border: `1px solid ${isSelected ? 'var(--color-tertiary)' : '#e2e8f0'}`, background: isSelected ? 'var(--color-tertiary)' : 'white', color: isSelected ? 'white' : '#64748b', cursor: allVariants.length > 1 ? 'pointer' : 'default', transition: 'all 0.2s'
                              }}
                            >
                              {v.size}
                            </button>
                          );
                        })}
                      </div>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '5px', width: '100%', alignItems: 'center', marginTop: 'clamp(15px, 3vw, 25px)' }}>
                          <Link
                            href={`/products/${p._id}`}
                            prefetch={true}
                            style={{
                              flex: 1, background: 'transparent', color: 'var(--color-primary)', border: '2px solid var(--color-primary)', padding: 'clamp(0.3rem, 1.5vw, 0.65rem) 0', borderRadius: '30px', fontWeight: 700, fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'normal', lineHeight: 1.2, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                          >
                            View More
                          </Link>

                          <div style={{ flex: 1.15, display: 'flex' }}>
                            {(() => {
                              const cartItem = cart.find(c => c._id === activeCartId);
                              if (p.inStock === false) {
                                return (
                                  <button disabled style={{ background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed', border: '2px solid #e2e8f0', boxShadow: 'none', width: '100%', padding: 'clamp(0.3rem, 1.5vw, 0.65rem) 0', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)', whiteSpace: 'normal', lineHeight: 1.2 }}>
                                    Out of Stock
                                  </button>
                                );
                              }
                              if (cartItem) {
                                return (
                                  <div style={{ display: 'flex', alignItems: 'stretch', background: '#f1f5f9', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '2px solid #e2e8f0', width: '100%', justifyContent: 'space-between' }}>
                                    <button onClick={() => updateQuantity(activeCartId, -1)} style={{ padding: 'clamp(0.3rem, 1.5vw, 0.65rem) clamp(0.4rem, 2vw, 0.8rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#334155', fontWeight: 'bold', fontSize: 'clamp(0.9rem, 3vw, 1.2rem)', transition: 'background 0.2s', cursor: 'pointer', border: 'none' }}>-</button>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                                      <span style={{ fontWeight: 800, color: '#0f172a', textAlign: 'center', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{cartItem.quantity}</span>
                                    </div>
                                    <button onClick={() => updateQuantity(activeCartId, 1)} style={{ padding: 'clamp(0.3rem, 1.5vw, 0.65rem) clamp(0.4rem, 2vw, 0.8rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-tertiary)', color: 'white', fontWeight: 'bold', fontSize: 'clamp(0.9rem, 3vw, 1.2rem)', transition: 'background 0.2s', cursor: 'pointer', border: 'none' }}>+</button>
                                  </div>
                                );
                              }
                              return (
                                <button onClick={() => handleAddToCart(p, vi)} style={{ width: '100%', background: 'var(--color-tertiary)', color: 'white', border: '2px solid var(--color-tertiary)', padding: 'clamp(0.3rem, 1.5vw, 0.65rem) 0', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: 'clamp(0.65rem, 2.5vw, 0.9rem)', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'normal', lineHeight: 1.2 }}>
                                  Add to Cart
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </>
                  );
                })()}
              </div>
            </motion.div>
          ))}
          {products.length === 0 && (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem', color: '#666' }}>
              We are currently restocking our wellness collection! Please visit again soon.
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
