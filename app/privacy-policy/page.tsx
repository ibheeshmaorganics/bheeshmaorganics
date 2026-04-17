import Link from 'next/link';

export default function PrivacyPolicy() {
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
      
      <h1 style={{ color: '#166534', marginBottom: '1.5rem', fontSize: '2.5rem' }}>Privacy Policy</h1>
      <div style={{ lineHeight: '1.8', color: '#333' }}>
        <p style={{ marginBottom: '1rem' }}><strong>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong></p>
        
        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>1. Information We Collect</h2>
        <p style={{ marginBottom: '1rem' }}>
          When you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, billing address, shipping address, payment information, email address, and phone number. We refer to this information as "Order Information."
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>2. How We Use Your Information</h2>
        <p style={{ marginBottom: '1rem' }}>
          We use the Order Information that we collect generally to fulfill any orders placed through the Site (including processing your payment information, arranging for shipping, and providing you with invoices and/or order confirmations). Additionally, we use this Order Information to communicate with you and screen our orders for potential risk or fraud.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>3. Sharing Your Personal Information</h2>
        <p style={{ marginBottom: '1rem' }}>
          We share your Personal Information with third parties to help us use your Personal Information, as described above. We do not sell your personal data to third parties. We may also share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>4. Data Retention</h2>
        <p style={{ marginBottom: '1rem' }}>
          When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>5. Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>
          For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at <strong>ibheeshmaorganics@gmail.com</strong>.
        </p>
      </div>
    </div>
  );
}
