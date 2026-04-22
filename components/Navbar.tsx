'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Navbar.module.css';
import { readCart, getCartCount } from '@/lib/cart';

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
      setCartCount(getCartCount(readCart()));
    };
    const handleVisibility = () => {
      if (!document.hidden) updateCount();
    };
    const handleWindowFocus = () => updateCount();
    const handleStorage = () => updateCount();

    updateCount();
    const interval = setInterval(() => {
      if (!document.hidden) updateCount();
    }, 5000);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <header 
      className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}
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
                <span 
                  key={cartCount}
                  style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--color-tertiary)', color: 'white', fontSize: '0.8rem', fontWeight: 800, padding: '2px 6px', borderRadius: '12px', zIndex: 10, border: '2px solid white' }}
                >
                  {cartCount}
                </span>
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
    </header>
  );
}
