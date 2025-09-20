import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import AllProjects from './components/AllProjects';

const root = ReactDOM.createRoot(document.getElementById('root'));

function render() {
  const hash = window.location.hash || '#/';
  if (hash.startsWith('#/all-projects')) {
    root.render(
      <React.StrictMode>
        <AllProjects />
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
