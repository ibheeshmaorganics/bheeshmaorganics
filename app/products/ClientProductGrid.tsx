'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { type CartItem } from '@/lib/cart';
import { useCart } from '@/hooks/useCart';
import { upsertCartItem, updateCartItemQuantity } from '@/lib/cart-operations';
import { getAllVariants, getVariantPrice, type VariantOption } from '@/lib/product-variants';
import { ProductImageCarousel } from './components/ProductImageCarousel';
import { QuantityStepper } from './components/QuantityStepper';
import { AddToCartButton } from './components/AddToCartButton';

interface Product { _id: string; name: string; category: string; price: number; discount?: number; images?: string[]; imageUrl?: string; description?: string; inStock?: boolean; variants?: VariantOption[]; quantity?: number; unit?: string; }

export default function ClientProductGrid({ products: initialProducts }: { products: Product[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const { cart, syncCart, refreshCartWithLatest } = useCart();

  useEffect(() => {
    // Aggressively pre-warm all product destination pages natively into background memory instantly 
    // ensuring literal 0ms routing transitions matching 'auto fetching' user priorities.
    initialProducts.forEach(p => {
      router.prefetch(`/products/${p._id}`);
    });
  }, [initialProducts, router]);

  // Background auto-fetching running continuously
  useEffect(() => {
    const refreshProducts = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/products', { cache: 'no-store' });
        const data = await res.json();

        if (data && data.products) {
          setProducts((data.products as Product[]).map((p) => ({
            ...p,
            category: '100% Organic',
            discount: p.discount || 0,
            images: p.images || []
          })));
          void refreshCartWithLatest();
        }
      } catch {
        // Silently ignore network errors to keep the UI smooth
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        void refreshProducts();
      }
    };

    const interval = setInterval(async () => {
      await refreshProducts();
    }, 5000);

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshCartWithLatest]);

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

  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});

  const updateCart = (newCart: CartItem[]) => {
    syncCart(newCart);
  };

  const handleAddToCart = (product: Product, variantIndex: number = -1) => {
    if (product.inStock === false) return;

    const allVariants = getAllVariants(product);

    const variant = variantIndex >= 0 ? allVariants[variantIndex] : allVariants[0];

    const cartId = `${product._id}-${variant.size}`;
    const displayName = `${product.name} - ${variant.size}`;
    const basePrice = variant.price;
    const finalPrice = getVariantPrice(basePrice, product.discount);

    const cartItem: CartItem = {
      ...product,
      _id: cartId,
      name: displayName,
      price: finalPrice,
      quantity: 1,
      originalPrice: basePrice,
      productIdOriginal: product._id,
    };
    updateCart(upsertCartItem(cart, cartItem));

  };

  const updateQuantity = (cartId: string, delta: number) => {
    const existingItem = cart.find((item) => item._id === cartId);
    if (!existingItem) return;
    updateCart(updateCartItemQuantity(cart, cartId, delta));
  };

  return (
    <div style={{ minHeight: '80vh', background: 'linear-gradient(135deg, #102A1C 0%, #295936 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(75, 174, 79, 0.15) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(60px)', borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255, 179, 0, 0.1) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(60px)', borderRadius: '50%' }}></div>
      <div className="container" style={{ padding: 'clamp(6.5rem, 10vw, 8rem) 1rem clamp(2rem, 5vw, 4rem) 1rem', maxWidth: '1300px', position: 'relative', zIndex: 10 }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .responsiveGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.65rem;
          }
          .productCard {
            background: #ffffff;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.55);
            display: flex;
            flex-direction: column;
            min-width: 0;
            max-width: 100vw;
            transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          }
          .productCard:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
            border-color: rgba(255, 255, 255, 0.85);
          }
          @media (hover: none), (pointer: coarse) {
            .productCard:hover {
              transform: none;
              box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
              border-color: rgba(255, 255, 255, 0.55);
            }
          }
          .productImageLink {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            border-bottom: 1px solid #eaeaea;
            text-decoration: none;
            color: inherit;
            height: 152px;
          }
          .productContent {
            padding: 0.62rem;
            min-width: 0;
            background: #ffffff;
          }
          .productActions {
            display: flex;
            flex-direction: row;
            gap: 5px;
            width: 100%;
            align-items: center;
            margin-top: 10px;
          }
          .variantRow {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            flex-wrap: wrap;
          }
          @media (max-width: 420px) {
            .responsiveGrid { gap: 0.88rem; }
            .productImageLink { height: 136px; }
            .productContent { padding: 0.55rem; }
          }
          @media (max-width: 768px) {
            .responsiveGrid { gap: 1.05rem; }
            .variantRow { display: none; }
          }
          @media (min-width: 640px) {
            .responsiveGrid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 1rem;
            }
            .productCard { border-radius: 20px; }
            .productImageLink { height: 180px; }
            .productContent { padding: 1rem; }
            .productActions { gap: 8px; margin-top: 18px; }
          }
          @media (min-width: 1024px) {
            .responsiveGrid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 1.5rem;
            }
            .productCard { border-radius: 24px; }
            .productImageLink { height: 220px; }
            .productContent { padding: 1.25rem; }
            .productActions { margin-top: 22px; }
          }
        `}} />
        <div className="responsiveGrid">
          {visibleProducts.map(p => (
            <div
              key={p._id}
              className="productCard"
            >
              <Link href={`/products/${p._id}`} prefetch={true} className="productImageLink">
                <ProductImageCarousel images={p.images && p.images.length > 0 ? p.images : (p.imageUrl ? [p.imageUrl] : [])} name={p.name} />
              </Link>
              <div className="productContent">
                {(() => {
                  const allVariants = getAllVariants(p);
                  const vi = selectedVariants[p._id] || 0;
                  const currentBasePrice = allVariants[vi].price;
                  const currentFinalPrice = getVariantPrice(currentBasePrice, p.discount);
                  const activeCartId = `${p._id}-${allVariants[vi].size}`;
                  const actionControlHeight = '44px';
                  const actionBorderRadius = '10px';

                  return (
                    <>
                      <Link href={`/products/${p._id}`} prefetch={true} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', width: '100%', marginBottom: '10px' }}>
                        <h3
                          style={{
                            fontSize: 'clamp(0.9rem, 2.5vw, 1.15rem)',
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            textTransform: 'capitalize',
                            margin: 0,
                            width: '100%',
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {p.name}
                        </h3>

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
                      </Link>

                      <div className="variantRow">
                        {allVariants.map((v, idx: number) => {
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
                        <div className="productActions">
                          <Link
                            href={`/products/${p._id}`}
                            prefetch={true}
                            style={{
                              flex: '0 0 40%',
                              height: actionControlHeight,
                              background: 'transparent',
                              color: 'var(--color-primary)',
                              border: '2px solid var(--color-primary)',
                              padding: '0 6px',
                              borderRadius: actionBorderRadius,
                              fontWeight: 700,
                              fontSize: 'clamp(0.8rem, 2.75vw, 1rem)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'normal',
                              lineHeight: 1.2,
                              textDecoration: 'none',
                              textAlign: 'center',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                          >
                            Details
                          </Link>

                          <div style={{ flex: '0 0 60%', display: 'flex' }}>
                            {(() => {
                              const cartItem = cart.find(c => c._id === activeCartId);
                              if (cartItem) {
                                return (
                                  <QuantityStepper
                                    quantity={cartItem.quantity}
                                    onDecrement={() => updateQuantity(activeCartId, -1)}
                                    onIncrement={() => updateQuantity(activeCartId, 1)}
                                    containerStyle={{ display: 'flex', alignItems: 'stretch', background: '#f1f5f9', borderRadius: actionBorderRadius, overflow: 'hidden', border: '2px solid #e2e8f0', width: '100%', justifyContent: 'space-between', height: actionControlHeight }}
                                    decrementButtonStyle={{ padding: '0 clamp(0.4rem, 2vw, 0.8rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#334155', fontWeight: 'bold', fontSize: 'clamp(0.9rem, 3vw, 1.2rem)', transition: 'background 0.2s', cursor: 'pointer', border: 'none', height: '100%' }}
                                    incrementButtonStyle={{ padding: '0 clamp(0.4rem, 2vw, 0.8rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-tertiary)', color: 'white', fontWeight: 'bold', fontSize: 'clamp(0.9rem, 3vw, 1.2rem)', transition: 'background 0.2s', cursor: 'pointer', border: 'none', height: '100%' }}
                                    quantityStyle={{ fontWeight: 800, color: '#0f172a', textAlign: 'center', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}
                                  />
                                );
                              }
                              return (
                                <AddToCartButton
                                  inStock={p.inStock !== false}
                                  onAdd={() => handleAddToCart(p, vi)}
                                  style={{ width: '100%', height: actionControlHeight, background: 'var(--color-tertiary)', color: 'white', border: '2px solid var(--color-tertiary)', padding: '0', borderRadius: actionBorderRadius, fontWeight: 700, fontSize: 'clamp(0.72rem, 2.75vw, 1rem)', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'normal', lineHeight: 1.2 }}
                                  outOfStockStyle={{ background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed', border: '2px solid #e2e8f0', boxShadow: 'none', width: '100%', height: actionControlHeight, padding: '0', borderRadius: actionBorderRadius, fontWeight: 700, fontSize: 'clamp(0.72rem, 2.75vw, 1rem)', whiteSpace: 'normal', lineHeight: 1.2 }}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </>
                  );
                })()}
              </div>
              </div>
          ))}
          {products.length === 0 && (
            <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem', color: '#666' }}>
              We are currently restocking our wellness collection! Please visit again soon.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
