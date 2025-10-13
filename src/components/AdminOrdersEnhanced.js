import React, { useEffect, useState, useMemo } from 'react';
import { 
  FaSearch, FaDownload, FaEnvelope, FaEdit, 
  FaCheck, FaTimes, FaSort, FaSortUp, 
  FaSortDown, FaFileExport, FaCheckSquare, FaSquare 
} from 'react-icons/fa';
import { API_ENDPOINTS } from '../config/api';
import './AdminOrdersEnhanced.css';

function AdminOrdersEnhanced({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Enhanced state for filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Bulk actions
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  
  // Edit mode
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchOrders();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.ORDERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const ordersArray = Array.isArray(data) ? data : data.orders || [];
      setOrders(ordersArray);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      // Search filter
      const searchMatch = !searchTerm || 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id?.toString().includes(searchTerm) ||
        order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === 'all' || order.status === statusFilter;
      
      // Date filter
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const orderDate = new Date(order.created_at);
        const now = new Date();
        switch (dateFilter) {
          case 'today':
            dateMatch = orderDate.toDateString() === now.toDateString();
            break;
          case 'week':
            dateMatch = (now - orderDate) <= 7 * 24 * 60 * 60 * 1000;
            break;
          case 'month':
            dateMatch = (now - orderDate) <= 30 * 24 * 60 * 60 * 1000;
            break;
          default:
            dateMatch = true;
        }
      }
      
      return searchMatch && statusMatch && dateMatch;
    });

    // Sort orders
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'total_amount') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortField === 'created_at') {
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
  }, [orders, searchTerm, statusFilter, dateFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const updateOrder = async (id, updates) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ORDERS}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        setOrders(orders => orders.map(o => o.id === id ? { ...o, ...updates } : o));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update error:', error);
      return false;
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.size === 0) return;
    
    const promises = Array.from(selectedOrders).map(orderId => {
      switch (bulkAction) {
        case 'mark-shipped':
          return updateOrder(orderId, { status: 'shipped' });
        case 'mark-delivered':
          return updateOrder(orderId, { status: 'delivered' });
        case 'mark-processing':
          return updateOrder(orderId, { status: 'processing' });
        default:
          return Promise.resolve();
      }
    });
    
    await Promise.all(promises);
    setSelectedOrders(new Set());
    setBulkAction('');
  };

  const toggleOrderSelection = (orderId) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === filteredAndSortedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredAndSortedOrders.map(o => o.id)));
    }
  };

  const startEditing = (order) => {
    setEditingOrder(order.id);
    setEditForm({
      status: order.status,
      tracking_number: order.tracking_number || '',
      notes: order.notes || ''
    });
  };

  const saveEdit = async () => {
    const success = await updateOrder(editingOrder, editForm);
    if (success) {
      setEditingOrder(null);
      setEditForm({});
    }
  };

  const downloadReceipt = async (id) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ORDERS}/${id}/receipt`, {
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
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const sendReceipt = async (id) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.ORDERS}/${id}/send-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('Receipt sent successfully!');
      }
    } catch (error) {
      console.error('Send receipt error:', error);
    }
  };

  const exportOrders = () => {
    const csvData = filteredAndSortedOrders.map(order => ({
      'Order ID': order.id,
      'Customer Name': order.customer_name,
      'Email': order.customer_email,
      'Status': order.status,
      'Total': order.total_amount,
      'Date': new Date(order.created_at).toLocaleDateString(),
      'Tracking': order.tracking_number || 'N/A'
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

  if (loading) return <div className="loading">Loading orders...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="admin-orders-enhanced">
      {/* Header with actions */}
      <div className="orders-header">
        <h2>Order Management</h2>
        <div className="header-actions">
          <button onClick={exportOrders} className="export-btn">
            <FaFileExport />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Search orders, customers, emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <div className="bulk-actions">
          <span>{selectedOrders.size} orders selected</span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
          >
            <option value="">Choose Action</option>
            <option value="mark-processing">Mark as Processing</option>
            <option value="mark-shipped">Mark as Shipped</option>
            <option value="mark-delivered">Mark as Delivered</option>
          </select>
          <button onClick={handleBulkAction} disabled={!bulkAction}>
            Apply
          </button>
          <button onClick={() => setSelectedOrders(new Set())}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>
                <button onClick={toggleAllOrders} className="select-all-btn">
                  {selectedOrders.size === filteredAndSortedOrders.length && filteredAndSortedOrders.length > 0 ? 
                    <FaCheckSquare /> : <FaSquare />
                  }
                </button>
              </th>
              <th onClick={() => handleSort('id')} className="sortable">
                Order ID {getSortIcon('id')}
              </th>
              <th onClick={() => handleSort('customer_name')} className="sortable">
                Customer {getSortIcon('customer_name')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {getSortIcon('status')}
              </th>
              <th onClick={() => handleSort('total_amount')} className="sortable">
                Total {getSortIcon('total_amount')}
              </th>
              <th onClick={() => handleSort('created_at')} className="sortable">
                Date {getSortIcon('created_at')}
              </th>
              <th>Tracking</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedOrders.map(order => (
              <tr key={order.id} className={selectedOrders.has(order.id) ? 'selected' : ''}>
                <td>
                  <button onClick={() => toggleOrderSelection(order.id)} className="select-btn">
                    {selectedOrders.has(order.id) ? <FaCheckSquare /> : <FaSquare />}
                  </button>
                </td>
                <td className="order-id">#{order.id}</td>
                <td>
                  <div className="customer-info">
                    <strong>{order.customer_name}</strong>
                    <br />
                    <small>{order.customer_email}</small>
                  </div>
                </td>
                <td>
                  {editingOrder === order.id ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  )}
                </td>
                <td className="amount">${order.total_amount}</td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                  {editingOrder === order.id ? (
                    <input
                      type="text"
                      value={editForm.tracking_number}
                      onChange={(e) => setEditForm({...editForm, tracking_number: e.target.value})}
                      placeholder="Tracking number"
                    />
                  ) : (
                    order.tracking_number || 'N/A'
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    {editingOrder === order.id ? (
                      <>
                        <button onClick={saveEdit} className="save-btn">
                          <FaCheck />
                        </button>
                        <button onClick={() => setEditingOrder(null)} className="cancel-btn">
                          <FaTimes />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditing(order)} className="edit-btn">
                          <FaEdit />
                        </button>
                        <button onClick={() => downloadReceipt(order.id)} className="download-btn">
                          <FaDownload />
                        </button>
                        <button onClick={() => sendReceipt(order.id)} className="email-btn">
                          <FaEnvelope />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedOrders.length === 0 && (
        <div className="no-results">
          No orders found matching your criteria.
        </div>
      )}
    </div>
  );
}

export default AdminOrdersEnhanced;