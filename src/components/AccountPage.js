import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function AccountPageContent() {
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/customer/orders', {
        credentials: 'include' // Send cookies for auth
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.hash = '#/';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32
      }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>My Account</h1>
          <p style={{ color: '#6b7280' }}>{user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            padding: '8px 16px',
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Order History */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600
        }}>
          Order History
        </div>

        {loading && (
          <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
            Loading orders...
          </div>
        )}

        {error && (
          <div style={{
            padding: 24,
            color: '#dc2626',
            background: '#fef2f2',
            margin: 16,
            borderRadius: 8
          }}>
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
            <p>No orders yet.</p>
            <a
              href="#/"
              style={{ color: '#2563eb', textDecoration: 'none' }}
            >
              Browse products
            </a>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div>
            {orders.map((order) => (
              <div
                key={order.id}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    Order #{order.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {formatDate(order.created_at)} &middot; {order.items?.length || 0} item(s)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {formatCurrency(order.total)}
                  </div>
                  <div style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: `${getStatusColor(order.status)}20`,
                    color: getStatusColor(order.status),
                    display: 'inline-block',
                    textTransform: 'capitalize'
                  }}>
                    {order.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a
          href="#/"
          style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}
        >
          &larr; Back to Home
        </a>
      </div>
    </div>
  );
}

// Wrap with ProtectedRoute
function AccountPage() {
  return (
    <ProtectedRoute redirectTo="#/login">
      <AccountPageContent />
    </ProtectedRoute>
  );
}

export default AccountPage;
