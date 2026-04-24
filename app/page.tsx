'use client';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Marquee from 'react-fast-marquee';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldCheck, BadgeCheck, MapPinned, Truck } from 'lucide-react';
import styles from './page.module.css';

const fadeUp: any = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" } }
};

const PRODUCTS_HERO_DESKTOP_BG = 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/shop_hero_bg';
const PRODUCTS_HERO_MOBILE_BG = 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto,c_fill,ar_9:16,g_auto/v1/images/shop_hero_bg';

export default function Home() {
  const router = useRouter();
  const trustHighlights = [
    { icon: ShieldCheck, label: 'Secure Payments' },
    { icon: BadgeCheck, label: 'Assured Quality' },
    { icon: MapPinned, label: 'Made In India' },
    { icon: Truck, label: 'Timely Delivery' },
  ] as const;

  useEffect(() => {
    // Aggressively prefetch the products page right away so it instantly renders
    router.prefetch('/products');

    // Warm Products hero backgrounds while user is on Home.
    const desktopImg = new window.Image();
    desktopImg.src = PRODUCTS_HERO_DESKTOP_BG;
    const mobileImg = new window.Image();
    mobileImg.src = PRODUCTS_HERO_MOBILE_BG;
  }, [router]);

  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <Image src="https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/hero_herbal_bg" alt="Herbal Landscape Background" fill priority sizes="100vw" style={{ objectFit: 'cover', zIndex: -1, pointerEvents: 'none' }} />
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>

        <div className={`container ${styles.heroContent}`}>
          <div
            className={styles.heroText}
          >
            <div className={styles.tag}>
              🍃 Premium Ayurvedic Wellness
            </div>
            <h1 className={styles.title}>
              India's Trusted <br />
              <span className={styles.highlight}>Organic & Ayurvedic</span> <br />
              Brand
            </h1>
            <p className={styles.subtitle}>
              From natural sourcing to carefully crafted products. Discover the power of Himalayan Sea Buckthorn, known for its nutritional benefits, antioxidant properties, and support for immunity.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/products" prefetch={true} className={`btn btn-primary ${styles.btnLarge}`}>View Products</Link>
              <Link href="/about" prefetch={true} className={`btn ${styles.btnOutline}`}>Our Story</Link>
            </div>

            <div className={styles.badges}>
              <span>✓ Quality Ingredients</span>
              <span>✓ Herbal Formulations</span>
              <span>✓ Ayurvedic Inspired</span>
            </div>

          </div>

          <div
            className={styles.heroImageContainer}
          >
            <Image src="https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/group_products" alt="Bheeshma Organics Product Collection" fill sizes="(max-width: 768px) 100vw, 380px" className={styles.heroMainImage} style={{ objectFit: 'cover' }} priority />
          </div>
        </div>
      </section>

      {/* Marketplace Availability Section */}
      <section className={styles.platformSection}>
        <div className="container">
          <div className={styles.platformContent}>
            <div className={styles.platformLogoRow}>
              <a
                href="https://www.amazon.in/stores/BHEESHMAORGANICS/page/9E599402-C004-44CE-AD94-F92B6CE1B68A?lp_context_asin=B0GPQTGS4S&ref_=cm_sw_r_apann_ast_store_74NN36C7C6B899KEPKJB&dplnk=Y&dplnkId=f4420508-c96c-4c8a-9f98-1eddb62f7e98"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.platformLogoLink}
                aria-label="Visit Bheeshma Organics Amazon Brand Store"
              >
                <Image
                  src="https://res.cloudinary.com/dmqxeysfq/image/upload/q_auto/f_auto/v1776673075/amazon-logo-amazon-icon-free-free-vector_qfjwhq.jpg"
                  alt="Available on Amazon"
                  width={220}
                  height={80}
                  className={styles.platformLogo}
                />
              </a>
              <a
                href="https://dl.flipkart.com/dl/bheeshma-organics-himalayan-sea-buckthorn-pulp-concentrate/p/itm845870d47a9f3?pid=DAJHHHHZF5XWGMQF&lid=LSTDAJHHHHZF5XWGMQFEKEQRZ&hl_lid=&marketplace=FLIPKART&fm=eyJ3dHAiOiJhdGxhc19wcm9kdWN0X3N1bW1hcnlfZ3JpZF9iZWF1dHkiLCJwcnB0Ijoic3AiLCJtaWQiOiJhZHMifQ=="
                target="_blank"
                rel="noopener noreferrer"
                className={styles.platformLogoLink}
                aria-label="View Bheeshma Organics product on Flipkart"
              >
                <Image
                  src="https://res.cloudinary.com/dmqxeysfq/image/upload/q_auto/f_auto/v1776673076/Flipkart_logo__2026_kr1lis.svg"
                  alt="Available on Flipkart"
                  width={220}
                  height={80}
                  className={styles.platformLogo}
                />
              </a>
            </div>

            <p className={styles.platformEyebrow}>Also available on</p>
            <p className={styles.platformSub}>
              Bheeshma Organics is now available on Amazon and Flipkart for easy ordering, secure payments, and reliable delivery.
              Explore our official listings and buy with trust.
            </p>

          </div>
        </div>
      </section>

      {/* Branding Section */}
      <section className={styles.brandingSection}>
        <div className="container">
          <motion.div
            className={styles.brandingHeader}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={styles.brandingTitle}>Bheeshma Organics™</h2>
            <p className={styles.brandingSubtitle}>
              India's Trusted Organic & Ayurvedic Wellness Brand
            </p>
            <div className={styles.brandingDivider}></div>
            <p className={styles.brandingTagline}>
              Carefully Selected Herbs | Botanical Extracts | Himalayan Sea Buckthorn
            </p>
          </motion.div>

          <motion.div
            className={styles.brandGrid}
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {[
              { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/quality', text: 'Quality Ingredients', desc: 'Sourced purely from nature' },
              { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/herbal', text: 'Herbal Formulations', desc: 'Rooted in traditional science' },
              { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/botanical', text: 'Botanical Extracts', desc: 'Potency in every drop' },
              { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/manufactured', text: 'Carefully Manufactured', desc: 'Highest hygiene standards' },
              { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/ayurvedic', text: 'Ayurvedic Inspired', desc: 'Balancing mind & body' }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUp} className={styles.brandItem}>
                <div className={styles.brandImageWrapper}>
                  <Image src={item.icon} alt={item.text} fill sizes="120px" className={styles.brandImage} />
                </div>
                <h3 className={styles.brandText}>{item.text}</h3>
                <p className={styles.brandDesc}>{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className={styles.whyChooseSection}>
        <div className="container">
          <motion.div
            className={styles.whyHeader}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={styles.whyTitle}>Why Choose Bheeshma Organics?</h2>
            <div className={styles.whyDivider}></div>
            <p className={styles.whySubtitle}>We are committed to delivering the highest quality holistic wellness products, rooted in nature and proven by science.</p>
          </motion.div>

          <div className={styles.whyGridWrapper}>
            {/* Desktop View */}
            <div className={styles.whyGrid}>
              {[
                { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/pure_organic', title: '100% Pure & Organic', text: 'No artificial additives, fillers, or harmful chemicals. We source only the finest raw botanical ingredients.' },
                { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/himalayan_sourced', title: 'Himalayan Sourced', text: 'Our Sea Buckthorn is carefully hand-harvested from the pristine altitudes of the Himalayas for maximum potency.' },
                { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/gmp_certified', title: 'GMP Certified Quality', text: 'Manufactured in state-of-the-art facilities following strict purity, safety, and hygiene standards.' },
                { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/ethical_sustainable', title: 'Ethical & Sustainable', text: 'We believe in giving back to nature and supporting local farming communities with fair trade practices.' },
                { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/quality', title: 'Clinically Proven', text: 'Our formulations are rigorously tested for safety, efficacy, and nutritional value before ever reaching your home.' },
                { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/ayurvedic', title: 'Ayurvedic Heritage', text: 'We honor ancient Indian medicinal wisdom, perfectly balancing modern scientific extraction with traditional healing methods.' }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  className={styles.whyCard}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                >
                  <div className={styles.whyImageWrapper}>
                    <Image src={feature.icon} alt={feature.title} fill sizes="(max-width: 768px) 100vw, 30vw" className={styles.whyImage} />
                  </div>
                  <h3 className={styles.whyCardTitle}>{feature.title}</h3>
                  <p className={styles.whyCardText}>{feature.text}</p>
                </motion.div>
              ))}
            </div>

            {/* Mobile View with Native React Fast Marquee */}
            <div className={styles.mobileMarquee}>
              <Marquee speed={40} gradient={false} pauseOnHover={true}>
                {[
                  { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/pure_organic', title: '100% Pure & Organic', text: 'No artificial additives, fillers, or harmful chemicals. We source only the finest raw botanical ingredients.' },
                  { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/himalayan_sourced', title: 'Himalayan Sourced', text: 'Our Sea Buckthorn is carefully hand-harvested from the pristine altitudes of the Himalayas for maximum potency.' },
                  { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/gmp_certified', title: 'GMP Certified Quality', text: 'Manufactured in state-of-the-art facilities following strict purity, safety, and hygiene standards.' },
                  { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/ethical_sustainable', title: 'Ethical & Sustainable', text: 'We believe in giving back to nature and supporting local farming communities with fair trade practices.' },
                  { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/quality', title: 'Clinically Proven', text: 'Our formulations are rigorously tested for safety, efficacy, and nutritional value before ever reaching your home.' },
                  { icon: 'https://res.cloudinary.com/dmqxeysfq/image/upload/f_auto,q_auto/v1/images/ayurvedic', title: 'Ayurvedic Heritage', text: 'We honor ancient Indian medicinal wisdom, perfectly balancing modern scientific extraction with traditional healing methods.' }
                ].map((feature, idx) => (
                  <div key={`m-${idx}`} className={styles.whyCardMobile}>
                    <div className={styles.whyImageWrapper}>
                      <Image src={feature.icon} alt={feature.title} fill sizes="280px" className={styles.whyImage} />
                    </div>
                    <h3 className={styles.whyCardTitle}>{feature.title}</h3>
                    <p className={styles.whyCardText}>{feature.text}</p>
                  </div>
                ))}
              </Marquee>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Highlights Section */}
      <section className={styles.trustSection}>
        <div className="container">
          <div className={styles.trustGrid}>
            {trustHighlights.map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.label} className={styles.trustCard}>
                <span className={styles.trustIcon} aria-hidden="true">
                  <Icon size={28} strokeWidth={2.2} />
                </span>
                <h3 className={styles.trustLabel}>{item.label}</h3>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <motion.section
        className={styles.mission}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <div className={`container ${styles.missionContent}`}>
          <div className={styles.missionGlassWrapper}>
            <h2>Our Mission</h2>
            <p>
              To expand into a complete range of herbal, Ayurvedic, and natural wellness products that promote a healthy lifestyle using traditional knowledge and natural ingredients.
            </p>
            <p className={styles.missionHighlight}>
              "We believe in purity, quality, and the power of nature for better health."
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
