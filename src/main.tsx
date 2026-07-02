import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA and better background audio handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

// Temporary CSP debugger for mobile
document.addEventListener('securitypolicyviolation', (e) => {
  alert(`CSP VIOLATION:
Directive: ${e.violatedDirective}
Blocked URI: ${e.blockedURI}
Original Policy: ${e.originalPolicy}`);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
