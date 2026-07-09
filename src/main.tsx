import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ReactGA from 'react-ga4';
import App from './App.tsx';
import './index.css';

// Initialize Google Analytics (GA4)
// ReactGA.initialize('G-XXXXXXXXXX');

// Register Service Worker for PWA and better background audio handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
