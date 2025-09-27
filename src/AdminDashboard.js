import React, { useState } from 'react';
import AdminLogin from './components/AdminLogin';
import AdminOrders from './components/AdminOrders';

function AdminDashboard() {
  const [token, setToken] = useState(null);

  return !token
    ? <AdminLogin onLogin={setToken} />
    : <AdminOrders token={token} />;
}

export default AdminDashboard;
