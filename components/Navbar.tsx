'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    const updateCount = () => {
      const cart = JSON.parse(localStorage.getItem('bheeshma_cart') || '[]');
      const count = cart.reduce((acc: number, item: any) => acc + item.quantity, 0);
      setCartCount(count);
    };
    updateCount();
    const interval = setInterval(updateCount, 1000); // 1-second poller for instantaneous updates globally

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.header 
      className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="container">
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logo}>
            Bheeshma <span className={styles.logoHighlight}>Organics</span>
          </Link>
          
          <nav className={styles.navLinks}>
            {['Home', 'Shop', 'About'].map((link) => (
              <Link 
                key={link} 
                href={link === 'Home' ? '/' : link === 'Shop' ? '/products' : `/${link.toLowerCase()}`}
                className={styles.navLink}
              >
                {link}
              </Link>
            ))}
          </nav>
          
          <div className={styles.actionArea}>
            <Link href="/track" className={`btn ${styles.orderStatusBtn}`}>My Orders</Link>
            <Link href="/checkout" className={styles.cartIcon} title="Cart" style={{ position: 'relative' }}>
              {cartCount > 0 && (
                <motion.span 
                  key={cartCount}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--color-tertiary)', color: 'white', fontSize: '0.8rem', fontWeight: 800, padding: '2px 6px', borderRadius: '12px', zIndex: 10, border: '2px solid white' }}
                >
                  {cartCount}
                </motion.span>
              )}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
