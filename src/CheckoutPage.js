import React, { useState } from 'react';
import projects from './data/projects';
import Banner from './components/Banner';
import VanillaStripeCheckout from './components/VanillaStripeCheckout';

function CheckoutPage({ projectId }) {
  const project = projects.find(p => p.id === projectId);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  
  // Shipping Address
  const [shippingAddress1, setShippingAddress1] = useState('');
  const [shippingAddress2, setShippingAddress2] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [shippingCountry, setShippingCountry] = useState('United States');
  
  // Billing Address
  const [billingIsSame, setBillingIsSame] = useState(true);
  const [billingAddress1, setBillingAddress1] = useState('');
  const [billingAddress2, setBillingAddress2] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingCountry, setBillingCountry] = useState('United States');
  
  const [status, setStatus] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [orderAmount, setOrderAmount] = useState(0);

  if (!project) return <div>Project not found.</div>;

  // Calculate project pricing
  const getProjectPrice = (project) => {
    // Individual project pricing
    const projectPricing = {
      'nasa-digital-to-analog': 299,    // Digital to Analog Transformation
      'nasa-ssrg': 349,                 // Space Suit RoboGlove (SSRG)
      'nasa-hydration': 399,            // Freeze-Resistant Hydration System
      'blendbot': 149,                  // BlendBot Ink Mixer
      'k3s-cluster': 199                // K3s Cluster Infrastructure & CI/CD
    };
    
    // Return individual project price, or default if not found
    return projectPricing[project.id] || 199;
  };

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!buyerName || !buyerEmail || !buyerPhone || 
        !shippingAddress1 || !shippingCity || !shippingState || !shippingZip) {
      setStatus('Please fill in all required shipping information.');
      return;
    }
    
    // Validate billing address if different from shipping
    if (!billingIsSame && (!billingAddress1 || !billingCity || !billingState || !billingZip)) {
      setStatus('Please fill in all required billing information.');
      return;
    }
    
    const price = getProjectPrice(project);
    setOrderAmount(price);
    setShowPayment(true);
    setStatus('');
  };

  const handlePaymentSuccess = (paymentIntent) => {
    setStatus('Payment successful! Order confirmed. Check your email for details.');
    setShowPayment(false);
  };

  const handlePaymentError = (error) => {
    setStatus(`Payment failed: ${error.message}`);
  };

  // For free/demo projects, allow direct order placement
  const handleFreeOrder = async (e) => {
    e.preventDefault();
    setStatus('Submitting...');
    
    const fullShippingAddress = `${shippingAddress1}${shippingAddress2 ? `, ${shippingAddress2}` : ''}, ${shippingCity}, ${shippingState} ${shippingZip}, ${shippingCountry}`;
    const fullBillingAddress = billingIsSame ? fullShippingAddress : 
      `${billingAddress1}${billingAddress2 ? `, ${billingAddress2}` : ''}, ${billingCity}, ${billingState} ${billingZip}, ${billingCountry}`;
    
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerEmail,
          buyerName,
          buyerPhone,
          shippingAddress: fullShippingAddress,
          billingAddress: fullBillingAddress,
          items: [{ projectId: project.id, name: project.title, price: 0 }],
          requiresPayment: false
        })
      });
      
      if (res.ok) {
        setStatus('Order placed! Check your email for confirmation.');
      } else {
        setStatus('Error placing order.');
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
    }
  };

  return (
    <>
      <Banner />
      <div style={{ height: 48 }} />
      <div style={{ maxWidth: 600, margin: '5.5rem auto 2rem auto', background: 'linear-gradient(135deg, #f8fafc 0%, #e3eafc 100%)', padding: 40, borderRadius: 18, boxShadow: '0 8px 32px rgba(25, 118, 210, 0.10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ color: '#1976d2', fontSize: '2.2rem', marginBottom: 8, fontWeight: 700 }}>Checkout</h2>
          <div style={{ fontSize: '1.2rem', color: '#333', marginBottom: 8 }}>{project.title}</div>
          <div style={{ color: '#555', fontSize: '1rem', marginBottom: 4 }}>{project.group}</div>
        </div>
        
        {!showPayment ? (
          // Customer Information Form
          <form onSubmit={handleInfoSubmit} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(25,118,210,0.07)', padding: 28 }}>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2', marginBottom: 8 }}>
                Project: {project.title}
              </div>
              <div style={{ fontSize: '16px', color: '#666' }}>
                Price: ${getProjectPrice(project).toFixed(2)}
              </div>
            </div>
            
            {/* Customer Information Section */}
            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #e3f2fd' }}>
              <h3 style={{ color: '#1976d2', marginBottom: 16, fontSize: '1.3rem' }}>Customer Information</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Full Name *</label>
                  <input 
                    value={buyerName} 
                    onChange={e => setBuyerName(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Phone Number *</label>
                  <input 
                    type="tel"
                    value={buyerPhone} 
                    onChange={e => setBuyerPhone(e.target.value)} 
                    required 
                    placeholder="(555) 123-4567"
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Email Address *</label>
                <input 
                  type="email" 
                  value={buyerEmail} 
                  onChange={e => setBuyerEmail(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                />
              </div>
            </div>

            {/* Shipping Address Section */}
            <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #e3f2fd' }}>
              <h3 style={{ color: '#1976d2', marginBottom: 16, fontSize: '1.3rem' }}>Shipping Address</h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Address Line 1 *</label>
                <input 
                  value={shippingAddress1} 
                  onChange={e => setShippingAddress1(e.target.value)} 
                  required 
                  placeholder="123 Main Street"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Address Line 2</label>
                <input 
                  value={shippingAddress2} 
                  onChange={e => setShippingAddress2(e.target.value)} 
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>City *</label>
                  <input 
                    value={shippingCity} 
                    onChange={e => setShippingCity(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>State *</label>
                  <input 
                    value={shippingState} 
                    onChange={e => setShippingState(e.target.value)} 
                    required 
                    placeholder="CA"
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>ZIP Code *</label>
                  <input 
                    value={shippingZip} 
                    onChange={e => setShippingZip(e.target.value)} 
                    required 
                    placeholder="12345"
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Country *</label>
                <select 
                  value={shippingCountry} 
                  onChange={e => setShippingCountry(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }}
                >
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Billing Address Section */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#1976d2', marginBottom: 16, fontSize: '1.3rem' }}>Billing Address</h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 500, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={billingIsSame} 
                    onChange={e => setBillingIsSame(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Billing address is the same as shipping address
                </label>
              </div>
              
              {!billingIsSame && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Address Line 1 *</label>
                    <input 
                      value={billingAddress1} 
                      onChange={e => setBillingAddress1(e.target.value)} 
                      required={!billingIsSame}
                      placeholder="123 Main Street"
                      style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                    />
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Address Line 2</label>
                    <input 
                      value={billingAddress2} 
                      onChange={e => setBillingAddress2(e.target.value)} 
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>City *</label>
                      <input 
                        value={billingCity} 
                        onChange={e => setBillingCity(e.target.value)} 
                        required={!billingIsSame}
                        style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>State *</label>
                      <input 
                        value={billingState} 
                        onChange={e => setBillingState(e.target.value)} 
                        required={!billingIsSame}
                        placeholder="CA"
                        style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>ZIP Code *</label>
                      <input 
                        value={billingZip} 
                        onChange={e => setBillingZip(e.target.value)} 
                        required={!billingIsSame}
                        placeholder="12345"
                        style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Country *</label>
                    <select 
                      value={billingCountry} 
                      onChange={e => setBillingCountry(e.target.value)} 
                      required={!billingIsSame}
                      style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }}
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {getProjectPrice(project) > 0 ? (
                <button type="submit" style={{ flex: 1, padding: '12px 0', background: 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  Proceed to Payment
                </button>
              ) : (
                <button type="button" onClick={handleFreeOrder} style={{ flex: 1, padding: '12px 0', background: 'linear-gradient(90deg, #4caf50 0%, #81c784 100%)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  Place Free Order
                </button>
              )}
            </div>
          </form>
        ) : (
          // Stripe Payment Form
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(25,118,210,0.07)', padding: 28 }}>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <h3 style={{ color: '#1976d2', marginBottom: 8 }}>Complete Payment</h3>
              <div style={{ color: '#666', marginBottom: 8 }}>
                Customer: {buyerName} ({buyerEmail}) | Phone: {buyerPhone}
              </div>
              <div style={{ color: '#666', fontSize: '14px', marginBottom: 4 }}>
                Shipping: {shippingAddress1}{shippingAddress2 ? `, ${shippingAddress2}` : ''}, {shippingCity}, {shippingState} {shippingZip}
              </div>
              {!billingIsSame && (
                <div style={{ color: '#666', fontSize: '14px' }}>
                  Billing: {billingAddress1}{billingAddress2 ? `, ${billingAddress2}` : ''}, {billingCity}, {billingState} {billingZip}
                </div>
              )}
            </div>
            
            <VanillaStripeCheckout
              project={project}
              amount={orderAmount}
              customerInfo={{
                name: buyerName,
                email: buyerEmail,
                phone: buyerPhone,
                shippingAddress: `${shippingAddress1}${shippingAddress2 ? `, ${shippingAddress2}` : ''}, ${shippingCity}, ${shippingState} ${shippingZip}, ${shippingCountry}`,
                billingAddress: billingIsSame ? 
                  `${shippingAddress1}${shippingAddress2 ? `, ${shippingAddress2}` : ''}, ${shippingCity}, ${shippingState} ${shippingZip}, ${shippingCountry}` :
                  `${billingAddress1}${billingAddress2 ? `, ${billingAddress2}` : ''}, ${billingCity}, ${billingState} ${billingZip}, ${billingCountry}`
              }}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
            
            <button 
              onClick={() => setShowPayment(false)}
              style={{ 
                width: '100%', 
                marginTop: 16, 
                padding: '8px 0', 
                background: 'transparent', 
                color: '#1976d2', 
                border: '1px solid #1976d2', 
                borderRadius: 6, 
                cursor: 'pointer', 
                fontSize: '0.9rem' 
              }}
            >
              ← Back to Customer Info
            </button>
          </div>
        )}
        
        {status && (
          <div style={{ 
            marginTop: 24, 
            textAlign: 'center', 
            color: status.includes('Error') || status.includes('failed') ? '#d32f2f' : '#388e3c', 
            fontWeight: 500,
            padding: '12px',
            backgroundColor: status.includes('Error') || status.includes('failed') ? '#ffebee' : '#e8f5e8',
            borderRadius: '6px'
          }}>
            {status}
          </div>
        )}
      </div>
    </>
  );
}

export default CheckoutPage;
