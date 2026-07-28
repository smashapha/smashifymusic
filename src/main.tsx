import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ReactGA from 'react-ga4';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
registerSW({ immediate: true });

// Initialize Google Analytics (GA4)
// ReactGA.initialize('G-XXXXXXXXXX');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
