import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ReactGA from 'react-ga4';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// One-time takeover reload to prevent stale chunks
let reloaded = false;
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloaded && navigator.serviceWorker.controller) {
      reloaded = true;
      window.location.reload();
    }
  });
}

// Register Service Worker for PWA and fetch newest sw immediately
registerSW({
  immediate: true,
  onRegistered(registration) {
    if (registration) {
      registration.update().catch(() => {});
    }
  }
});

// Initialize Google Analytics (GA4)
// ReactGA.initialize('G-XXXXXXXXXX');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
