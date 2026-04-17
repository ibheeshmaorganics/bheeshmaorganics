import Link from 'next/link';

export default function ShippingPolicy() {
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
      
      <h1 style={{ color: '#166534', marginBottom: '1.5rem', fontSize: '2.5rem' }}>Shipping Policy</h1>
      <div style={{ lineHeight: '1.8', color: '#333' }}>
        <p style={{ marginBottom: '1rem' }}><strong>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong></p>
        
        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>1. Order Processing Time</h2>
        <p style={{ marginBottom: '1rem' }}>
          All orders are processed within 1 to 3 business days (excluding weekends and holidays) after receiving your order confirmation email. You will receive another notification when your order has shipped, along with your tracking information.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>2. Shipping Rates & Estimates</h2>
        <p style={{ marginBottom: '1rem' }}>
          Shipping charges for your order will be calculated and displayed at checkout. Delivery delays can occasionally occur due to unforeseen circumstances with our delivery partners. Standard delivery typically takes 3 to 7 business days depending on your location within India.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>3. Order Tracking</h2>
        <p style={{ marginBottom: '1rem' }}>
          When your order has shipped, you will receive an email notification from us which will include a tracking number you can use to check its status. Please allow 48 hours for the tracking information to become available via our platform.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>4. Shipping Restrictions</h2>
        <p style={{ marginBottom: '1rem' }}>
          Currently, we only ship to addresses within India. We do not offer international shipping at this time. We are unable to ship to PO Boxes.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>5. Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>
          If you have any questions about the delivery of your order or our shipping practices, please contact us at <strong>ibheeshmaorganics@gmail.com</strong> or call us at <strong>9866846792</strong>.
        </p>
      </div>
    </div>
  );
}
