import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import AllProjects from './components/AllProjects';
import InfrastructureDocs from './components/InfrastructureDocs';

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
