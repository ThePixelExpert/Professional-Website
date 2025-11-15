import React, { useState, useEffect, useCallback } from 'react';
import { FaDollarSign, FaShoppingCart, FaClock, FaUsers, FaChartLine, FaChartBar } from 'react-icons/fa';
import { API_ENDPOINTS } from '../config/api';
import './AdminAnalytics.css';

function AdminAnalytics() {
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    uniqueCustomers: 0,
    recentOrders: [],
    statusBreakdown: {},
    monthlyRevenue: [],
    topServices: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS}?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        console.error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, fetchAnalytics]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#f39c12',
      'processing': '#3498db',
      'shipped': '#27ae60',
      'delivered': '#2ecc71',
      'cancelled': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const SimpleBarChart = ({ data, title }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(item => item.value));
    
    return (
      <div className="simple-chart">
        <h4>{title}</h4>
        <div className="chart-bars">
          {data.map((item, index) => (
            <div key={index} className="chart-bar-container">
              <div className="chart-label">{item.label}</div>
              <div className="chart-bar-wrapper">
                <div 
                  className="chart-bar" 
                  style={{ 
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: '#3498db'
                  }}
                />
                <span className="chart-value">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-spinner">
          <FaChartBar className="spinner-icon" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2><FaChartBar /> Analytics Dashboard</h2>
        <div className="time-range-selector">
          <label>Time Range:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card revenue">
          <div className="metric-icon">
            <FaDollarSign />
          </div>
          <div className="metric-content">
            <h3>{formatCurrency(analytics.totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="metric-card orders">
          <div className="metric-icon">
            <FaShoppingCart />
          </div>
          <div className="metric-content">
            <h3>{analytics.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>

        <div className="metric-card pending">
          <div className="metric-icon">
            <FaClock />
          </div>
          <div className="metric-content">
            <h3>{analytics.pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>
        </div>

        <div className="metric-card customers">
          <div className="metric-icon">
            <FaUsers />
          </div>
          <div className="metric-content">
            <h3>{analytics.uniqueCustomers}</h3>
            <p>Unique Customers</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Order Status Breakdown */}
        <div className="chart-card">
          <h3>Order Status Breakdown</h3>
          <div className="status-breakdown">
            {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
              <div key={status} className="status-item">
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(status) }}
                />
                <span className="status-label">{status}</span>
                <span className="status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services */}
        <div className="chart-card">
          <SimpleBarChart 
            data={analytics.topServices} 
            title="Most Popular Services"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3><FaChartLine /> Recent Orders</h3>
        <div className="activity-list">
          {analytics.recentOrders.slice(0, 5).map((order) => (
            <div key={order.id} className="activity-item">
              <div className="activity-details">
                <span className="customer-name">{order.customer_name}</span>
                <span className="order-id">#{order.id}</span>
              </div>
              <div className="activity-meta">
                <span className="order-amount">{formatCurrency(order.total_amount)}</span>
                <span 
                  className="order-status"
                  style={{ color: getStatusColor(order.status) }}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      {analytics.monthlyRevenue.length > 0 && (
        <div className="chart-card full-width">
          <SimpleBarChart 
            data={analytics.monthlyRevenue} 
            title="Monthly Revenue Trend"
          />
        </div>
      )}
    </div>
  );
}

export default AdminAnalytics;