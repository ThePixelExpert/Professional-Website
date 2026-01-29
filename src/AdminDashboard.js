import React, { useState } from 'react';
import { FaChartBar, FaShoppingCart, FaSignOutAlt, FaTachometerAlt, FaUsers, FaCog } from 'react-icons/fa';
import { useAuth } from './contexts/AuthContext';
import AdminRoute from './components/AdminRoute';
import AdminOrdersEnhanced from './components/AdminOrdersEnhanced';
import AdminAnalytics from './components/AdminAnalytics';
import AdminCustomers from './components/AdminCustomers';
import AdminSettings from './components/AdminSettings';
import './AdminDashboard.css';

function AdminDashboardContent() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  const handleLogout = async () => {
    try {
      await signOut();
      // signOut will trigger onAuthStateChange, which will update user to null
      // AdminRoute will then redirect to login
      window.location.hash = '#/admin/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <FaTachometerAlt />
          <h1>Edwards Tech Solutions - Admin Dashboard</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            {user?.email}
          </span>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            Logout
          </button>
        </div>
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
        {activeTab === 'orders' && <AdminOrdersEnhanced />}
        {activeTab === 'customers' && <AdminCustomers />}
        {activeTab === 'settings' && <AdminSettings />}
      </div>
    </div>
  );
}

// Wrap with AdminRoute for protection
function AdminDashboard() {
  return (
    <AdminRoute>
      <AdminDashboardContent />
    </AdminRoute>
  );
}

export default AdminDashboard;
