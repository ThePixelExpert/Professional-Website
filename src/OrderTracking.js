import React, { useState } from 'react';
import Banner from './components/Banner';
import Footer from './components/Footer';

function OrderTracking() {
  const [searchForm, setSearchForm] = useState({
    email: '',
    orderId: ''
  });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setSearchForm({
      ...searchForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const response = await fetch(`/api/orders/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: searchForm.email,
          orderId: searchForm.orderId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setOrder(data);
      } else {
        setError(data.error || 'Order not found');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async () => {
    try {
      const response = await fetch(`/api/orders/${order.id}/customer-receipt?email=${encodeURIComponent(order.customer_email)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${order.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download receipt');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download receipt');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'shipped': return '#10b981';
      case 'delivered': return '#059669';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'shipped': return '🚚';
      case 'delivered': return '✅';
      case 'cancelled': return '❌';
      default: return '📦';
    }
  };

  return (
    <div className="App">
      <Banner 
        sections={[
          { id: "search", label: "Track Order" },
          { id: "home", label: "Back to Home" }
        ]}
        showBack={true}
        backHref="#/"
      />
      
      <div style={{ 
        maxWidth: '800px', 
        margin: '2rem auto', 
        padding: '0 1rem',
        minHeight: '70vh'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ 
            color: '#1f2937', 
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Track Your Order
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
            <div style={{ 
              display: 'grid', 
              gap: '1rem', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  Email Address:
                </label>
                <input
                  type="email"
                  name="email"
                  value={searchForm.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your email address"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  color: '#374151'
                }}>
                  Order ID:
                </label>
                <input
                  type="text"
                  name="orderId"
                  value={searchForm.orderId}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your order ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Searching...' : '🔍 Track Order'}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#dc2626',
              marginBottom: '1rem'
            }}>
              ❌ {error}
            </div>
          )}

          {/* Order Display */}
          {order && (
            <div style={{
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.5rem',
              backgroundColor: '#f9fafb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <h2 style={{ color: '#1f2937', margin: 0 }}>
                  Order #{order.id}
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: getStatusColor(order.status),
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  {getStatusIcon(order.status)} {order.status.toUpperCase()}
                </div>
              </div>

              {/* Order Details */}
              <div style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                marginBottom: '1.5rem'
              }}>
                <div>
                  <strong>Order Date:</strong><br />
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
                <div>
                  <strong>Total Amount:</strong><br />
                  <span style={{ color: '#059669', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    ${parseFloat(order.total_amount).toFixed(2)}
                  </span>
                </div>
                {order.tracking_number && (
                  <div>
                    <strong>Tracking Number:</strong><br />
                    <span style={{ color: '#2563eb', fontFamily: 'monospace' }}>
                      {order.tracking_number}
                    </span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#374151', marginBottom: '1rem' }}>Items Ordered:</h3>
                <div style={{ 
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  {order.items.map((item, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '1rem',
                        borderBottom: index < order.items.length - 1 ? '1px solid #e5e7eb' : 'none',
                        backgroundColor: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        {item.description && (
                          <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div style={{ color: '#059669', fontWeight: 'bold' }}>
                        ${parseFloat(item.price || item.amount || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={downloadReceipt}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📄 Download Receipt
                </button>
                
                {order.tracking_number && (
                  <a
                    href={`https://www.ups.com/track?tracknum=${order.tracking_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold'
                    }}
                  >
                    🚚 Track Package
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default OrderTracking;