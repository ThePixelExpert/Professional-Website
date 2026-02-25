import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import AllProjects from './components/AllProjects';
import InfrastructureDocs from './components/InfrastructureDocs';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './components/AdminLogin';
import PurchasePage from './PurchasePage';
import CheckoutPage from './CheckoutPage';
import OrderTracking from './OrderTracking';
import CustomerAuth from './components/CustomerAuth';
import AccountPage from './components/AccountPage';
import OAuthCallback from './components/OAuthCallback';
import { AuthProvider } from './contexts/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));

function render() {
  const hash = window.location.hash || '#/';

  // Wrap content with AuthProvider
  const renderWithAuth = (Component, props = {}) => {
    root.render(
      <React.StrictMode>
        <AuthProvider>
          <Component {...props} />
        </AuthProvider>
      </React.StrictMode>
    );
  };

  if (hash.startsWith('#access_token=') || hash.startsWith('#error=')) {
    // OAuth callback: Supabase returns #access_token=... after Google login.
    // Route to OAuthCallback which waits for the async session before redirecting.
    renderWithAuth(OAuthCallback);
  } else if (hash.startsWith('#/all-projects')) {
    renderWithAuth(AllProjects);
  } else if (hash.startsWith('#/infrastructure-docs')) {
    renderWithAuth(InfrastructureDocs);
  } else if (hash.startsWith('#/admin/login')) {
    // New: dedicated admin login route
    renderWithAuth(AdminLogin);
  } else if (hash.startsWith('#/admin')) {
    // Admin dashboard (will be protected inside component)
    renderWithAuth(AdminDashboard);
  } else if (hash.startsWith('#/purchase/')) {
    const projectId = hash.replace('#/purchase/', '');
    renderWithAuth(PurchasePage, { projectId });
  } else if (hash.startsWith('#/checkout/')) {
    const projectId = hash.replace('#/checkout/', '');
    renderWithAuth(CheckoutPage, { projectId });
  } else if (hash.startsWith('#/track')) {
    renderWithAuth(OrderTracking);
  } else if (hash.startsWith('#/login') || hash.startsWith('#/signup')) {
    renderWithAuth(CustomerAuth);
  } else if (hash.startsWith('#/account')) {
    renderWithAuth(AccountPage);
  } else {
    renderWithAuth(App);
  }
}

window.addEventListener('hashchange', render);
render();

reportWebVitals();
