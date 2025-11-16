
import React, { useEffect, useState } from 'react';

function AdminOrders({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        // Handle both array response and {orders: []} response
        const ordersArray = Array.isArray(data) ? data : data.orders || [];
        setOrders(ordersArray);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [token]);

  const updateStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    setOrders(orders => orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const updateTracking = async (id, tracking_number) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ tracking_number })
    });
    setOrders(orders => orders.map(o => o.id === id ? { ...o, tracking_number } : o));
  };

  const downloadReceipt = async (id) => {
    try {
      const response = await fetch(`/api/orders/${id}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate receipt');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download receipt');
    }
  };

  const sendReceipt = async (id) => {
    try {
      const response = await fetch(`/api/orders/${id}/send-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('Receipt sent successfully!');
      } else {
        alert('Failed to send receipt');
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send receipt');
    }
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error loading orders.</div>;

  return (
    <div>
      <h2>Admin Orders Dashboard</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Buyer Email</th>
            <th>Items</th>
            <th>Status</th>
            <th>Change Status</th>
            <th>Tracking Number</th>
            <th>Set Tracking</th>
            <th>Receipt</th>
            <th>Email Receipt</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customer_email}</td>
              <td>{JSON.stringify(order.items)}</td>
              <td>{order.status}</td>
              <td>
                <select
                  value={order.status}
                  onChange={e => updateStatus(order.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </td>
              <td>{order.tracking_number || ''}</td>
              <td>
                <input
                  type="text"
                  defaultValue={order.tracking_number || ''}
                  placeholder="Enter tracking number"
                  onBlur={e => updateTracking(order.id, e.target.value)}
                  style={{ width: 120 }}
                />
              </td>
              <td>
                <button
                  onClick={() => downloadReceipt(order.id)}
                  style={{
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📄 Download
                </button>
              </td>
              <td>
                <button
                  onClick={() => sendReceipt(order.id)}
                  style={{
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📧 Send
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminOrders;
