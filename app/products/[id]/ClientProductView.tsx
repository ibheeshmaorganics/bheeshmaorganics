'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const styles: Record<string, string> = {
  container: 'bo-container',
  grid: 'bo-grid',
  imageSection: 'bo-imageSection',
  mainImageWrapper: 'bo-mainImageWrapper',
  mainImage: 'bo-mainImage',
  thumbnails: 'bo-thumbnails',
  thumb: 'bo-thumb',
  thumbActive: 'bo-thumbActive',
  infoSection: 'bo-infoSection',
  badge: 'bo-badge',
  title: 'bo-title',
  priceBlock: 'bo-priceBlock',
  currentPrice: 'bo-currentPrice',
  originalPrice: 'bo-originalPrice',
  discountBadge: 'bo-discountBadge',
  variantsSection: 'bo-variantsSection',
  sectionTitle: 'bo-sectionTitle',
  variantsGrid: 'bo-variantsGrid',
  variantPill: 'bo-variantPill',
  variantPillActive: 'bo-variantPillActive',
  actionButtons: 'bo-actionButtons',
  addToCartBtn: 'bo-addToCartBtn',
  qtyController: 'bo-qtyController',
  qtyBtn: 'bo-qtyBtn',
  plus: 'bo-plus',
  qtyNum: 'bo-qtyNum',
  descriptionBox: 'bo-descriptionBox'
};

export default function ClientProductView({ product }: { product: any }) {
  const router = useRouter();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem('bheeshma_cart') || '[]'));
    router.prefetch('/checkout');
    router.prefetch('/products');
  }, [router]);

  if (!product) return null;

  const images = product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [product.imageUrl] : []);
  const hasVariants = product.variants && product.variants.length > 0;

  const allVariants = hasVariants
    ? [{ size: `${product.quantity} ${product.unit}`, price: product.price }, ...product.variants]
    : [{ size: `${product.quantity} ${product.unit}`, price: product.price }];

  const currentBasePrice = Number(allVariants[selectedVariantIdx].price);
  const currentFinalPrice = product.discount && product.discount > 0
    ? Math.round(currentBasePrice - (currentBasePrice * product.discount / 100))
    : currentBasePrice;

  const currentSizeName = allVariants[selectedVariantIdx].size;
  const activeCartId = `${product._id}-${currentSizeName}`;
  const displayName = `${product.name} - ${currentSizeName}`;

  const updateCart = (newCart: any[]) => {
    setCart(newCart);
    localStorage.setItem('bheeshma_cart', JSON.stringify(newCart));
  };

  const handleAddToCart = () => {
    if (product.inStock === false) return;

    const existingIdx = cart.findIndex(c => c._id === activeCartId);
    if (existingIdx > -1) {
      const newCart = [...cart];
      newCart[existingIdx].quantity += 1;
      updateCart(newCart);
    } else {
      updateCart([...cart, {
        ...product,
        _id: activeCartId,
        name: displayName,
        price: currentFinalPrice,
        quantity: 1,
        originalPrice: currentBasePrice,
        productIdOriginal: product._id
      }]);
    }
    toast.success(`${displayName} added to cart!`);
  };

  const updateQuantity = (delta: number) => {
    const existingIdx = cart.findIndex(c => c._id === activeCartId);
    if (existingIdx === -1) return;
    const newCart = [...cart];
    newCart[existingIdx].quantity += delta;
    if (newCart[existingIdx].quantity <= 0) {
      newCart.splice(existingIdx, 1);
      toast.info(`Removed from cart`);
    }
    updateCart(newCart);
  };

  const cartItem = cart.find(c => c._id === activeCartId);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .bo-container {
          min-height: 90vh;
          background: var(--color-background);
          padding: 120px 2rem 4rem 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .bo-grid {
          display: grid;
          grid-template-columns: 45% 55%;
          gap: 4rem;
          background: white;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.06);
          padding: 3rem;
          min-height: 600px;
        }
        .bo-imageSection {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: sticky;
          top: 120px;
          height: fit-content;
        }
        .bo-mainImageWrapper {
          width: 100%;
          aspect-ratio: 1/1;
          background: #f8fafc;
          border-radius: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .bo-mainImage {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .bo-mainImage:hover {
          transform: scale(1.08);
        }
        .bo-thumbnails {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .bo-thumb {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          background: #f8fafc;
          object-fit: cover;
        }
        .bo-thumbActive {
          border-color: var(--color-primary);
          box-shadow: 0 4px 15px rgba(75, 174, 79, 0.25);
        }
        .bo-infoSection {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .bo-badge {
          display: inline-block;
          background: rgba(255, 179, 0, 0.15);
          color: var(--color-tertiary);
          padding: 6px 16px;
          border-radius: 30px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.85rem;
          width: fit-content;
        }
        .bo-title {
          font-size: 2.8rem;
          font-weight: 900;
          color: var(--color-text);
          line-height: 1.15;
          text-transform: capitalize;
          letter-spacing: -0.5px;
        }
        .bo-priceBlock {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #f8fafc;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }
        .bo-currentPrice {
          font-size: 3rem;
          font-weight: 900;
          color: var(--color-primary-dark);
        }
        .bo-originalPrice {
          font-size: 1.6rem;
          color: #94a3b8;
          text-decoration: line-through;
          font-weight: 600;
        }
        .bo-discountBadge {
          background: #dcfce7;
          color: #16a34a;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 900;
          font-size: 1.2rem;
        }
        .bo-variantsSection {
          margin-top: 0.5rem;
        }
        .bo-sectionTitle {
          font-size: 1.2rem;
          font-weight: 800;
          color: #334155;
          margin-bottom: 15px;
        }
        .bo-variantsGrid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .bo-variantPill {
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          border: 2px solid #e2e8f0;
          font-weight: 700;
          font-size: 0.95rem;
          background: white;
          transition: all 0.2s ease;
          color: #475569;
        }
        .bo-variantPillActive {
          border-color: var(--color-primary);
          background: rgba(75, 174, 79, 0.05);
          color: var(--color-primary-dark);
        }
        .bo-actionButtons {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          align-items: stretch;
        }
        .bo-addToCartBtn {
          flex: 0 1 220px;
          background: var(--color-tertiary);
          color: white;
          border: none;
          font-size: 1rem;
          font-weight: 800;
          border-radius: 12px;
          padding: 10px 0;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .bo-addToCartBtn:hover {
          background: var(--color-secondary);
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(255, 152, 0, 0.25);
        }
        .bo-qtyController {
          flex: 0 0 140px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid var(--color-tertiary);
          height: 44px;
        }
        .bo-qtyBtn {
          width: 44px;
          height: 100%;
          border: none;
          background: #f1f5f9;
          color: #334155;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .bo-qtyBtn:hover {
          background: #e2e8f0;
        }
        .bo-qtyBtn.bo-plus {
          background: var(--color-tertiary);
          color: white;
        }
        .bo-qtyBtn.bo-plus:hover {
          background: var(--color-secondary);
        }
        .bo-qtyNum {
          font-size: 1.05rem;
          font-weight: 900;
          color: #0f172a;
        }
        .bo-descriptionBox {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px dashed #f1f5f9;
        }
        .bo-descriptionBox p {
          color: #475569;
          line-height: 1.8;
          font-size: 1.15rem;
          white-space: pre-wrap;
        }
        .bo-desktop-only {
          display: flex;
        }
        .bo-mobile-only {
          display: none;
        }
        @media (max-width: 960px) {
          .bo-desktop-only { display: none !important; }
          .bo-mobile-only { display: flex !important; flex-direction: column; width: 100%; position: relative; top: 0; }
          .bo-discountBadge {
            font-size: 0.9rem;
            padding: 6px 12px;
          }
          .bo-grid {
            grid-template-columns: 1fr;
            padding: 1.5rem;
            gap: 2.5rem;
          }
          .bo-imageSection {
            position: relative;
            top: 0;
          }
          .bo-title {
            font-size: 1.6rem;
            word-break: break-word;
            overflow-wrap: anywhere;
            max-width: 100%;
          }
          .bo-priceBlock {
            padding: 15px;
          }
          .bo-currentPrice {
            font-size: 2.2rem;
          }
          .bo-actionButtons {
            flex-direction: row;
            flex-wrap: wrap;
          }
        }
      `}} />
    <div className={styles.container} style={{ overflowX: 'hidden', width: '100vw' }}>
      <button onClick={() => router.push('/products')} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        ← Back to Shop
      </button>

      <motion.div
        className={styles.grid}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Left Side: Images (Desktop) */}
        <div className={`${styles.imageSection} bo-desktop-only`}>
          <div style={{ position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                className={styles.mainImageWrapper}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {images.length > 0 ? (
                  <img src={images[selectedImage]} alt={product.name} className={styles.mainImage} />
                ) : (
                  <div style={{ fontSize: '5rem' }}>🌿</div>
                )}
              </motion.div>
            </AnimatePresence>

            {images.length > 1 && (
              <>
                <button 
                  onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)} 
                  style={{ position: 'absolute', top: '50%', left: '15px', transform: 'translateY(-50%)', width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontSize: '1.2rem', color: '#334155' }}
                >
                  ❮
                </button>
                <button 
                  onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)} 
                  style={{ position: 'absolute', top: '50%', right: '15px', transform: 'translateY(-50%)', width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontSize: '1.2rem', color: '#334155' }}
                >
                  ❯
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className={styles.thumbnails} style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '10px', paddingBottom: '10px', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
              {images.slice(0, 5).map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  onClick={() => setSelectedImage(i)}
                  className={`${styles.thumb} ${selectedImage === i ? styles.thumbActive : ''}`}
                  alt={`Thumbnail ${i}`}
                  style={{ flexShrink: 0, minWidth: '80px', cursor: 'pointer' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Left Side: Images Carousel (Mobile) */}
        <div className="bo-mobile-only" style={{ gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <div 
               id="mobile-image-carousel"
               style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: '0', scrollbarWidth: 'none', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
               onScroll={(e) => {
                 const scrollLeft = e.currentTarget.scrollLeft;
                 const width = e.currentTarget.clientWidth;
                 const newIndex = Math.round(scrollLeft / width);
                 if(newIndex !== selectedImage) setSelectedImage(newIndex);
               }}
            >
              {images.length > 0 ? images.map((img: string, i: number) => (
                <img key={i} src={img} alt={product.name} style={{ width: '100%', flexShrink: 0, scrollSnapAlign: 'center', objectFit: 'cover', aspectRatio: '1/1' }} />
              )) : <div style={{ width: '100%', flexShrink: 0, scrollSnapAlign: 'start', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🌿</div>}
            </div>

            {images.length > 1 && (
              <>
                <button 
                  onClick={() => {
                    const el = document.getElementById('mobile-image-carousel');
                    if(el) el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' });
                  }} 
                  style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 8px rgba(0,0,0,0.1)', fontSize: '1rem', color: '#334155' }}
                >
                  ❮
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('mobile-image-carousel');
                    if(el) el.scrollBy({ left: el.clientWidth, behavior: 'smooth' });
                  }} 
                  style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 8px rgba(0,0,0,0.1)', fontSize: '1rem', color: '#334155' }}
                >
                  ❯
                </button>
              </>
            )}
          </div>
          
          {images.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {images.map((_: any, i: number) => (
                <span key={i} style={{ width: i === selectedImage ? '10px' : '6px', height: i === selectedImage ? '10px' : '6px', borderRadius: '50%', background: i === selectedImage ? 'var(--color-primary)' : '#cbd5e1', transition: 'all 0.2s ease', display: 'inline-block' }} />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Info */}
        <div className={styles.infoSection}>
          <div>
            <div className={styles.badge}>100% Organic</div>
            <h1 className={styles.title} style={{ wordWrap: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}>{product.name}</h1>
          </div>

          <div className={styles.variantsSection}>
            <h3 className={styles.sectionTitle}>Select Size</h3>
            <div className={styles.variantsGrid}>
              {allVariants.map((v: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedVariantIdx(idx)}
                  className={`${styles.variantPill} ${selectedVariantIdx === idx ? styles.variantPillActive : ''}`}
                  style={allVariants.length === 1 ? { pointerEvents: 'none' } : {}}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: 'clamp(15px, 4vw, 24px)', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '0.5rem', boxSizing: 'border-box', maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span className={styles.currentPrice}>₹{currentFinalPrice}</span>
                {product.discount && product.discount > 0 && (
                  <>
                    <span className={styles.originalPrice}>₹{currentBasePrice}</span>
                    <span className={styles.discountBadge}>{product.discount}% OFF</span>
                  </>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>(Incl. of all taxes)</div>
            </div>

            <div className={styles.actionButtons} style={{ marginTop: '0', flexWrap: 'wrap' }}>
              {product.inStock === false ? (
                <button className={styles.addToCartBtn} disabled style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', boxShadow: 'none' }}>
                  Out of Stock
                </button>
              ) : cartItem ? (
                <>
                  <div className={styles.qtyController}>
                    <button onClick={() => updateQuantity(-1)} className={styles.qtyBtn}>-</button>
                    <span className={styles.qtyNum}>{cartItem.quantity}</span>
                    <button onClick={() => updateQuantity(1)} className={`${styles.qtyBtn} ${styles.plus}`}>+</button>
                  </div>
                  <button onClick={() => router.push('/checkout')} className={styles.addToCartBtn} style={{ background: '#10b981' }}>
                    Proceed to Checkout →
                  </button>
                </>
              ) : (
                <button onClick={handleAddToCart} className={styles.addToCartBtn}>
                  Add to Cart
                </button>
              )}
            </div>
          </div>

          {product.description && (
            <div className={styles.descriptionBox}>
              <h3 className={styles.sectionTitle}>About this product</h3>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
    </>
  );
}
