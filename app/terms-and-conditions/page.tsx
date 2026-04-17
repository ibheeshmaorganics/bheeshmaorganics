import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div style={{ padding: '120px 2rem 2rem 2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link 
          href="/" 
          style={{ 
            display: 'inline-block', 
            padding: '10px 20px', 
            backgroundColor: '#166534', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px',
            fontWeight: '600',
            transition: 'background-color 0.2s'
          }}
        >
          &larr; Back
        </Link>
      </div>
      
      <h1 style={{ color: '#166534', marginBottom: '1.5rem', fontSize: '2.5rem' }}>Terms & Conditions</h1>
      <div style={{ lineHeight: '1.8', color: '#333' }}>
        <p style={{ marginBottom: '1rem' }}><strong>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong></p>
        
        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>1. Introduction</h2>
        <p style={{ marginBottom: '1rem' }}>
          Welcome to Bheeshma Organics. These terms and conditions outline the rules and regulations for the use of our website and the purchase of our products. By accessing this website, we assume you accept these terms and conditions.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>2. Use of the Site</h2>
        <p style={{ marginBottom: '1rem' }}>
          By using this website, you warrant that you are at least the age of majority in your state or province of residence. You may not use our products for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>3. Products and Services</h2>
        <p style={{ marginBottom: '1rem' }}>
          Certain products or services may be available exclusively online through the website. These products or services may have limited quantities and are subject to our return and refund policies. We have made every effort to display as accurately as possible the colors and images of our products.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>4. Modifications to the Service and Prices</h2>
        <p style={{ marginBottom: '1rem' }}>
          Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>5. Contact Information</h2>
        <p style={{ marginBottom: '1rem' }}>
          Questions about the Terms of Service should be sent to us at <strong>ibheeshmaorganics@gmail.com</strong>.
        </p>
      </div>
    </div>
  );
}
