import React, { useState } from 'react';
import { FaChartBar, FaShoppingCart, FaSignOutAlt, FaTachometerAlt, FaUsers, FaCog } from 'react-icons/fa';
import AdminLogin from './components/AdminLogin';
import AdminOrdersEnhanced from './components/AdminOrdersEnhanced';
import AdminAnalytics from './components/AdminAnalytics';
import AdminCustomers from './components/AdminCustomers';
import AdminSettings from './components/AdminSettings';
import './AdminDashboard.css';

function AdminDashboard() {
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');

  const handleLogout = () => {
    setToken(null);
    setActiveTab('analytics');
    localStorage.removeItem('adminToken');
  };

  if (!token) {
    return <AdminLogin onLogin={setToken} />;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <FaTachometerAlt />
          <h1>Edwards Tech Solutions - Admin Dashboard</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt />
          Logout
        </button>
      </div>
      
      <div className="admin-navigation">
        <button 
          className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <FaChartBar />
          Analytics
        </button>
        <button 
          className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <FaShoppingCart />
          Orders
        </button>
        <button 
          className={`nav-tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <FaUsers />
          Customers
        </button>
        <button 
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FaCog />
          Settings
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'analytics' && <AdminAnalytics />}
        {activeTab === 'orders' && <AdminOrdersEnhanced token={token} />}
        {activeTab === 'customers' && <AdminCustomers token={token} />}
        {activeTab === 'settings' && <AdminSettings token={token} />}
      </div>
    </div>
  );
}

export default AdminDashboard;
