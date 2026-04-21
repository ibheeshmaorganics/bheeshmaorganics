'use client';

import Image from 'next/image';

export function ProductImageCarousel({ images, name }: { images: string[]; name: string }) {
  if (!images || images.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
        🌿
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff' }}>
        <Image src={images[0]} alt={name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" priority style={{ objectFit: 'cover', objectPosition: 'center', borderRadius: '8px' }} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
      <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', width: '100%', height: '100%', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
        {images.map((img, i) => (
          <div key={i} style={{ width: '100%', height: '100%', position: 'relative', flexShrink: 0, scrollSnapAlign: 'start', background: '#ffffff' }}>
            <Image src={img} alt={name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" priority={i === 0} style={{ objectFit: 'cover', objectPosition: 'center' }} />
          </div>
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
