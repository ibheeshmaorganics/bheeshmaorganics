import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerContent}`}>
        <div className={styles.section}>
          <h3 className={styles.brand}>Bheeshma Organics</h3>
          <p className={styles.description}>
            India&apos;s Trusted Herbal & Sea Buckthorn Wellness Brand.
            Carefully Selected Herbs | Botanical Extracts | Himalayan Sea Buckthorn.
          </p>
          <div className={styles.socials}>
            <a href="https://www.facebook.com/bheeshmaorganics92/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Facebook">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/bheeshma.organics_official" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Instagram">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
             <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label="Twitter">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>

        <div className={styles.sideBySide}>
          <div className={styles.section}>
            <h4 className={styles.heading}>Legal</h4>
            <div className={styles.infoGroup}>
              <a href="/terms-and-conditions" className={styles.info} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '8px', transition: 'color 0.2s' }}>Terms &amp; Conditions</a>
              <a href="/privacy-policy" className={styles.info} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '8px', transition: 'color 0.2s' }}>Privacy Policy</a>
              <a href="/shipping-policy" className={styles.info} style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: '8px', transition: 'color 0.2s' }}>Shipping Policy</a>
              <a href="/refund-policy" className={styles.info} style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'color 0.2s' }}>Refund Policy</a>
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.heading}>Contact Us</h4>
            <div className={styles.infoGroup}>
              <p className={styles.info}>📞 9866846792</p>
              <p className={styles.info}>✉️ ibheeshmaorganics@gmail.com</p>
            </div>
            <div className={styles.address}>
              <p>A2, G-Flex Hub, 3rd Floor, Block-A,</p>
              <p>Vyshnavi Complex, Opp. Best Price,</p>
              <p>Mangalagiri Road, Guntur,</p>
              <p>Andhra Pradesh, 522001, India</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.bottomBar}>
        <p>&copy; {new Date().getFullYear()} Bheeshma Organics. All rights reserved.</p>
      </div>
    </footer>
  );
}
