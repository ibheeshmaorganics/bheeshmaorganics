const fs = require('fs');
let content = fs.readFileSync('app/products/ClientProductGrid.tsx', 'utf8');

// Fix 1: Make ProductImageCarousel perfectly horizontally scrollable with snap
content = content.replace(
  /function ProductImageCarousel[\s\S]*?return \(.*?<div.*?<img src=\{images\[idx\]\}[\s\S]*?<\/div>\s*\);\s*\}/s,
  `function ProductImageCarousel({ images, name }: { images: string[], name: string }) {
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
          <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
        ))}
      </div>
    </div>
  );
}`
);

// Fix 2: Make whole card clickable except for the buttons container
content = content.replace(
  `<div onClick={() => router.push(\`/products/\${p._id}\`)} style={{ cursor: 'pointer', height: 'clamp(140px, 35vw, 220px)'`,
  `<div onClick={() => router.push(\`/products/\${p._id}\`)} style={{ cursor: 'pointer', height: 'clamp(140px, 35vw, 220px)'`
); // NOOP search check

content = content.replace(
  `                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', width: '100%', marginBottom: '10px' }}>`,
  `                      <div onClick={() => router.push(\`/products/\${p._id}\`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', width: '100%', marginBottom: '10px' }}>`
);

content = content.replace(
  `<h3 onClick={() => router.push(\`/products/\${p._id}\`)} style={{`,
  `<h3 style={{`
);

fs.writeFileSync('app/products/ClientProductGrid.tsx', content);
