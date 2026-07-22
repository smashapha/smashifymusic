import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ReactGA from 'react-ga4';
import App from './App.tsx';
import './index.css';

// Initialize Google Analytics (GA4)
// ReactGA.initialize('G-XXXXXXXXXX');

// Register Service Worker for PWA and better background audio handling

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
