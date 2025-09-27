import React, { useState } from 'react';
import projects from './data/projects';
import Banner from './components/Banner';

function CheckoutPage({ projectId }) {
  const project = projects.find(p => p.id === projectId);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('');

  if (!project) return <div>Project not found.</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Submitting...');
    const res = await fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerEmail,
        items: [{ projectId: project.id, name: project.title }],
        buyerName,
        address
      })
    });
    if (res.ok) {
      setStatus('Order placed! Check your email for confirmation.');
    } else {
      setStatus('Error placing order.');
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
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(25,118,210,0.07)', padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Your Name</label>
            <input value={buyerName} onChange={e => setBuyerName(e.target.value)} required style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Your Email</label>
            <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} required style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Shipping Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} required style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} />
          </div>
          <button type="submit" style={{ width: '100%', marginTop: 10, padding: '12px 0', background: 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(25,118,210,0.07)' }}>Place Order</button>
        </form>
        {status && <div style={{ marginTop: 24, textAlign: 'center', color: status.includes('Error') ? '#d32f2f' : '#388e3c', fontWeight: 500 }}>{status}</div>}
      </div>
    </>
  );
}

export default CheckoutPage;
