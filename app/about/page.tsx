'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AboutPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div style={{ background: 'linear-gradient(135deg, #102A1C 0%, #295936 100%)', minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(75, 174, 79, 0.15) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(60px)', borderRadius: '50%' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(255, 179, 0, 0.1) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(60px)', borderRadius: '50%' }}></div>

      <div className="container" style={{ position: 'relative', zIndex: 10, padding: '8rem 1rem 6rem 1rem', maxWidth: '900px' }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'flex-start' }}>
          <button 
            onClick={() => router.push('/')} 
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 24px', borderRadius: '30px', color: 'white', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: isMobile ? '0.65rem' : '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(10px)' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            <span style={{ fontSize: isMobile ? '0.78rem' : '1.2rem', lineHeight: 1 }}>←</span> Back to Home
          </button>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ textAlign: 'center', marginBottom: '4rem' }}
        >
          <span style={{ display: 'inline-block', padding: '0.5rem 1.5rem', backgroundColor: 'var(--color-tertiary)', color: 'white', borderRadius: '30px', fontWeight: 'bold', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.2)', fontSize: isMobile ? '0.65rem' : '1rem' }}>
            Our Story
          </span>
          <h1 style={{ fontSize: isMobile ? '2.9rem' : '4.5rem', fontWeight: 800, color: 'white', letterSpacing: '-1.5px', marginBottom: '1.5rem', lineHeight: 1.1 }}>
            Rooted in{' '}
            <span style={{ background: 'linear-gradient(120deg, var(--color-secondary) 0%, var(--color-tertiary) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Nature.
            </span>
          </h1>
          <p style={{ fontSize: isMobile ? '0.82rem' : '1.25rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8, maxWidth: '700px', margin: '0 auto' }}>
            Bheeshma Organics is a natural wellness brand focused on herbal and Ayurvedic health. 
            We started with Himalayan Sea Buckthorn, renowned for its antioxidant properties, immunity support, and skin health benefits.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          style={{ 
            background: 'white', 
            padding: '5rem 4rem', 
            borderRadius: '30px', 
            boxShadow: '0 25px 50px rgba(0,0,0,0.05)', 
            border: '1px solid rgba(0,0,0,0.03)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }}></div>
          
          <h2 style={{ fontSize: isMobile ? '1.62rem' : '2.5rem', color: 'var(--color-primary-dark)', marginBottom: '1.5rem', fontWeight: 700 }}>Our Mission</h2>
          <p style={{ fontSize: isMobile ? '0.78rem' : '1.2rem', color: 'var(--color-text-light)', lineHeight: 1.8, marginBottom: '2rem' }}>
            Our mission is to expand into a complete range of herbal, Ayurvedic, and natural wellness products that promote a healthy lifestyle using traditional knowledge and carefully selected botanical ingredients.
          </p>

          <div style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '2px dashed rgba(75, 174, 79, 0.2)', textAlign: 'center' }}>
            <p style={{ fontSize: isMobile ? '1.3rem' : '2rem', fontWeight: 700, fontStyle: 'italic', color: 'var(--color-tertiary)', lineHeight: 1.4 }}>
              "We believe in purity, quality, and the power of nature for better health."
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
