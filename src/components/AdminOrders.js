
import React, { useEffect, useState } from 'react';

function AdminOrders({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://192.168.0.242:3001/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setOrders)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [token]);

  const updateStatus = async (id, status) => {
    await fetch(`http://192.168.0.242:3001/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    setOrders(orders => orders.map(o => o.id === id ? { ...o, status } : o));
  };

  const updateTracking = async (id, trackingNumber) => {
    await fetch(`http://192.168.0.242:3001/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ trackingNumber })
    });
    setOrders(orders => orders.map(o => o.id === id ? { ...o, trackingNumber } : o));
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
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.buyerEmail}</td>
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
              <td>{order.trackingNumber || ''}</td>
              <td>
                <input
                  type="text"
                  defaultValue={order.trackingNumber || ''}
                  placeholder="Enter tracking number"
                  onBlur={e => updateTracking(order.id, e.target.value)}
                  style={{ width: 120 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminOrders;
