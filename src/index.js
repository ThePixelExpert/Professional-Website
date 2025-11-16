import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import AllProjects from './components/AllProjects';
import InfrastructureDocs from './components/InfrastructureDocs';
import AdminDashboard from './AdminDashboard';
import PurchasePage from './PurchasePage';
import CheckoutPage from './CheckoutPage';
import OrderTracking from './OrderTracking';

const root = ReactDOM.createRoot(document.getElementById('root'));

function render() {
  const hash = window.location.hash || '#/';
  if (hash.startsWith('#/all-projects')) {
    root.render(
      <React.StrictMode>
        <AllProjects />
      </React.StrictMode>
    );
  } else if (hash.startsWith('#/infrastructure-docs')) {
    root.render(
      <React.StrictMode>
        <InfrastructureDocs />
      </React.StrictMode>
    );
  } else if (hash.startsWith('#/admin')) {
    root.render(
      <React.StrictMode>
        <AdminDashboard />
      </React.StrictMode>
    );
  } else if (hash.startsWith('#/purchase/')) {
    const projectId = hash.replace('#/purchase/', '');
    root.render(
      <React.StrictMode>
        <PurchasePage projectId={projectId} />
      </React.StrictMode>
    );
  } else if (hash.startsWith('#/checkout/')) {
    const projectId = hash.replace('#/checkout/', '');
    root.render(
      <React.StrictMode>
        <CheckoutPage projectId={projectId} />
      </React.StrictMode>
    );
  } else if (hash.startsWith('#/track')) {
    root.render(
      <React.StrictMode>
        <OrderTracking />
      </React.StrictMode>
    );
  } else {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

window.addEventListener('hashchange', render);
render();

reportWebVitals();
