import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ReactGA from 'react-ga4';
import toast from 'react-hot-toast';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Non-disruptive update notice to avoid mid-task interruptions (e.g. ad uploads, form edits)
let hasNotifiedUpdate = false;
const notifyUpdate = () => {
  if (!hasNotifiedUpdate) {
    hasNotifiedUpdate = true;
    toast("Smashify has been updated — refresh to get the latest version.", {
      id: "smashify-sw-update",
      duration: 8000,
      icon: "🔄"
    });
  }
};

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (navigator.serviceWorker.controller) {
      notifyUpdate();
    }
  });
}

// Register Service Worker for PWA and fetch newest sw immediately
registerSW({
  immediate: true,
  onNeedReload() {
    notifyUpdate();
  },
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
