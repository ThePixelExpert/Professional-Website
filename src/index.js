import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import AllProjects from './components/AllProjects';

function render() {
  const hash = window.location.hash || '#/';
  if (hash === '#/all-projects') {
    ReactDOM.render(
      <React.StrictMode>
        <AllProjects />
      </React.StrictMode>,
      document.getElementById('root')
    );
  } else {
    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      document.getElementById('root')
    );
  }
}

window.addEventListener('hashchange', render);
render();

reportWebVitals();
