import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCalendar,
  FaDollarSign, FaShoppingCart, FaSearch, FaSort, FaSortUp,
  FaSortDown, FaEye, FaHistory, FaStar, FaChartLine,
  FaFileExport
} from 'react-icons/fa';
import { API_ENDPOINTS } from '../config/api';
import './AdminCustomers.css';

function AdminCustomers({ token }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('total_spent');
  const [sortDirection, setSortDirection] = useState('desc');
  const [customerType, setCustomerType] = useState('all'); // all, new, repeat, vip

  useEffect(() => {
    fetchCustomers();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.ADMIN_CUSTOMERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        setError('Failed to fetch customers');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process and filter customers
  const processedCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const searchMatch = !searchTerm || 
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm);
      
      let typeMatch = true;
      if (customerType !== 'all') {
        switch (customerType) {
          case 'new':
            typeMatch = customer.order_count === 1;
            break;
          case 'repeat':
            typeMatch = customer.order_count > 1 && customer.order_count < 5;
            break;
          case 'vip':
            typeMatch = customer.order_count >= 5 || customer.total_spent >= 2000;
            break;
          default:
            typeMatch = true;
        }
      }
      
      return searchMatch && typeMatch;
    });

    // Sort customers
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'total_spent' || sortField === 'order_count') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortField === 'last_order_date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [customers, searchTerm, sortField, sortDirection, customerType]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const getCustomerType = (customer) => {
    if (customer.order_count >= 5 || customer.total_spent >= 2000) return 'VIP';
    if (customer.order_count > 1) return 'Repeat';
    return 'New';
  };

  const getCustomerTypeColor = (type) => {
    switch (type) {
      case 'VIP': return '#gold';
      case 'Repeat': return '#3498db';
      case 'New': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const exportCustomers = () => {
    const csvData = processedCustomers.map(customer => ({
      'Name': customer.name,
      'Email': customer.email,
      'Phone': customer.phone || 'N/A',
      'Orders': customer.order_count,
      'Total Spent': `$${customer.total_spent}`,
      'Last Order': new Date(customer.last_order_date).toLocaleDateString(),
      'Type': getCustomerType(customer),
      'City': customer.city || 'N/A',
      'State': customer.state || 'N/A'
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const CustomerDetailsModal = ({ customer, onClose }) => {
    if (!customer) return null;
    
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="customer-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3><FaUser /> {customer.name}</h3>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          
          <div className="modal-content">
            <div className="customer-info-grid">
              <div className="info-section">
                <h4>Contact Information</h4>
                <div className="info-item">
                  <FaEnvelope />
                  <span>{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="info-item">
                    <FaPhone />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {(customer.city || customer.state) && (
                  <div className="info-item">
                    <FaMapMarkerAlt />
                    <span>{customer.city}, {customer.state}</span>
                  </div>
                )}
              </div>
              
              <div className="info-section">
                <h4>Order Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <FaShoppingCart />
                    <div>
                      <strong>{customer.order_count}</strong>
                      <span>Total Orders</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <FaDollarSign />
                    <div>
                      <strong>${customer.total_spent}</strong>
                      <span>Total Spent</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <FaCalendar />
                    <div>
                      <strong>{new Date(customer.last_order_date).toLocaleDateString()}</strong>
                      <span>Last Order</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <FaStar />
                    <div>
                      <strong style={{ color: getCustomerTypeColor(getCustomerType(customer)) }}>
                        {getCustomerType(customer)}
                      </strong>
                      <span>Customer Type</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-history">
              <h4><FaHistory /> Order History</h4>
              <div className="history-list">
                {customer.orders?.map(order => (
                  <div key={order.id} className="history-item">
                    <div className="order-summary">
                      <span className="order-id">#{order.id}</span>
                      <span className="order-date">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="order-details">
                      <span className="order-amount">${order.total_amount}</span>
                      <span 
                        className="order-status"
                        style={{ 
                          background: getStatusColor(order.status),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

  if (loading) return <div className="loading">Loading customers...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const totalCustomers = customers.length;
  const newCustomers = customers.filter(c => c.order_count === 1).length;
  const repeatCustomers = customers.filter(c => c.order_count > 1).length;
  const vipCustomers = customers.filter(c => c.order_count >= 5 || c.total_spent >= 2000).length;

  return (
    <div className="admin-customers">
      {/* Header */}
      <div className="customers-header">
        <h2>Customer Management</h2>
        <button onClick={exportCustomers} className="export-btn">
          <FaFileExport />
          Export CSV
        </button>
      </div>

      {/* Customer Stats */}
      <div className="customer-stats">
        <div className="stat-card total">
          <FaUser />
          <div>
            <strong>{totalCustomers}</strong>
            <span>Total Customers</span>
          </div>
        </div>
        <div className="stat-card new">
          <FaStar />
          <div>
            <strong>{newCustomers}</strong>
            <span>New Customers</span>
          </div>
        </div>
        <div className="stat-card repeat">
          <FaChartLine />
          <div>
            <strong>{repeatCustomers}</strong>
            <span>Repeat Customers</span>
          </div>
        </div>
        <div className="stat-card vip">
          <FaStar />
          <div>
            <strong>{vipCustomers}</strong>
            <span>VIP Customers</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
          >
            <option value="all">All Customers</option>
            <option value="new">New (1 order)</option>
            <option value="repeat">Repeat (2-4 orders)</option>
            <option value="vip">VIP (5+ orders or $2000+)</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="customers-table-container">
        <table className="customers-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Customer {getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('order_count')} className="sortable">
                Orders {getSortIcon('order_count')}
              </th>
              <th onClick={() => handleSort('total_spent')} className="sortable">
                Total Spent {getSortIcon('total_spent')}
              </th>
              <th onClick={() => handleSort('last_order_date')} className="sortable">
                Last Order {getSortIcon('last_order_date')}
              </th>
              <th>Type</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedCustomers.map(customer => (
              <tr key={customer.email}>
                <td>
                  <div className="customer-info">
                    <strong>{customer.name}</strong>
                    <br />
                    <small>{customer.email}</small>
                  </div>
                </td>
                <td className="order-count">{customer.order_count}</td>
                <td className="amount">${customer.total_spent}</td>
                <td>{new Date(customer.last_order_date).toLocaleDateString()}</td>
                <td>
                  <span 
                    className="customer-type-badge"
                    style={{ backgroundColor: getCustomerTypeColor(getCustomerType(customer)) }}
                  >
                    {getCustomerType(customer)}
                  </span>
                </td>
                <td>{customer.city || 'N/A'}, {customer.state || 'N/A'}</td>
                <td>
                  <button 
                    onClick={() => setSelectedCustomer(customer)}
                    className="view-btn"
                  >
                    <FaEye />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {processedCustomers.length === 0 && (
        <div className="no-results">
          No customers found matching your criteria.
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
        />
      )}
    </div>
  );
}

export default AdminCustomers;