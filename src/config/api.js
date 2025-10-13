// Environment-aware API base URL configuration
const getApiBaseUrl = () => {
  // In production, use relative URLs for same-origin requests
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // In development, use explicit localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  ORDERS: `${API_BASE_URL}/api/orders`,
  ADMIN_LOGIN: `${API_BASE_URL}/api/admin/login`,
  ADMIN_ANALYTICS: `${API_BASE_URL}/api/admin/analytics`,
  ADMIN_CUSTOMERS: `${API_BASE_URL}/api/admin/customers`,
  CREATE_PAYMENT_INTENT: `${API_BASE_URL}/api/create-payment-intent`,
  ORDER_TRACKING: `${API_BASE_URL}/api/orders/track`,
};

const apiConfig = { API_BASE_URL, API_ENDPOINTS };
export default apiConfig;