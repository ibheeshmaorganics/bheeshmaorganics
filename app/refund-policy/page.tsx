import Link from 'next/link';

export default function RefundPolicy() {
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

      <h1 style={{ color: '#166534', marginBottom: '1.5rem', fontSize: '2.5rem' }}>Refund and Returns Policy</h1>
      <div style={{ lineHeight: '1.8', color: '#333' }}>
        <p style={{ marginBottom: '1rem' }}><strong>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong></p>
        
        <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#fef2f2', 
            borderLeft: '4px solid #ef4444', 
            borderRadius: '4px',
            marginBottom: '2rem',
            marginTop: '1.5rem'
        }}>
            <h2 style={{ color: '#991b1b', marginTop: '0', marginBottom: '0.5rem', fontSize: '1.5rem' }}>No Returns Accepted</h2>
            <p style={{ margin: '0', color: '#7f1d1d' }}>
                For health, safety, and hygiene reasons, <strong>we do not accept returns on any of our products</strong>. All sales are considered final upon purchase. Please ensure you review your order carefully before checking out.
            </p>
        </div>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>Refunds & Return to Origin (RTO)</h2>
        <p style={{ marginBottom: '1rem' }}>
          We are committed to delivering our products to you safely. <strong>Refunds will only be issued in the event that the delivery of your order has completely failed.</strong>
        </p>
        <p style={{ marginBottom: '1rem' }}>
          If your tracking information states that the package could not be delivered or returned to our facility without ever reaching you (Return to Origin/RTO), you are eligible for a partial refund subject to our shipping deduction policy:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem', background: '#f8fafc', padding: '15px 15px 15px 35px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <li style={{ marginBottom: '0.5rem', color: '#1e293b' }}><strong>Online Prepaid Orders:</strong> If a fully prepaid order is returned to origin (e.g., customer unreachable, address invalid), a shipping and handling fee of <strong>₹99 will be strictly deducted</strong> from your total order value. The remaining balance will then be refunded to your original method of payment.</li>
            <li style={{ marginBottom: '0.5rem', color: '#1e293b' }}><strong>Cash on Delivery (COD) Orders:</strong> The <strong>₹99 advance payment required for COD processing is strictly non-refundable</strong> if the order is shipped and later returned to origin.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          <strong>To initiate a refund for a failed delivery:</strong>
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Contact us within 7 days of the estimated delivery date or the date the tracking status marks the delivery as failed.</li>
            <li style={{ marginBottom: '0.5rem' }}>Provide your order number and any relevant tracking details.</li>
            <li style={{ marginBottom: '0.5rem' }}>Our team will verify the failed delivery status with our shipping partner.</li>
        </ul>
        <p style={{ marginBottom: '1rem' }}>
          Once verified, your refund will be processed, and a credit will automatically be applied to your original method of payment within a certain amount of days.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>Damaged Items</h2>
        <p style={{ marginBottom: '1rem' }}>
          While we do not offer returns or standard refunds, if your product arrives severely damaged, please contact us immediately at <strong>ibheeshmaorganics@gmail.com</strong> with clear photos of the damaged item and packaging, along with your order number. We handle these exceptional incidents on a case-by-case basis to ensure a fair resolution.
        </p>

        <h2 style={{ color: '#166534', marginTop: '2rem', marginBottom: '1rem' }}>Contact Us</h2>
        <p style={{ marginBottom: '1rem' }}>
          If you have any questions regarding our policy or your order's delivery status, please contact us at:
        </p>
        <p style={{ marginBottom: '0.5rem' }}>Phone: <strong>9866846792</strong></p>
        <p style={{ marginBottom: '0.5rem' }}>Email: <strong>ibheeshmaorganics@gmail.com</strong></p>
      </div>
    </div>
  );
}
