const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update imports
code = code.replace(
  "import React, { useState, useEffect } from 'react';",
  "import React, { useState, useEffect, useRef } from 'react';"
);
code = code.replace(
  "import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';",
  "import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';"
);

// Replace PaymentRedirect
const oldRedirect = `const PaymentRedirect = ({ onTxRef }: { onTxRef: (ref: string) => void }) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref') || params.get('reference');
    if (txRef) {
      // Small timeout to ensure redirect completes before toast renders
      setTimeout(() => onTxRef(txRef), 100);
    }
  }, [onTxRef]);

  return <Navigate to="/home" replace />;
};`;

const newRedirect = `const PaymentRedirect = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your payment...');
  const hasKickedOff = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref') || params.get('reference');
    
    if (!txRef) {
      toast.error('No payment reference found.');
      navigate('/home', { replace: true });
      return;
    }

    if (hasKickedOff.current) return;
    hasKickedOff.current = true;

    const handleVerification = async () => {
      toast.loading('Confirming payment...', { id: 'payment-confirm' });
      try {
        await verifyPayment(txRef);
        toast.success('Payment confirmed! ✅', { id: 'payment-confirm' });
        setStatus('Payment confirmed! Redirecting...');
        await new Promise(r => setTimeout(r, 1000));
        window.dispatchEvent(new CustomEvent('smashify:payment-success', { detail: { txRef } }));
      } catch (err) {
        toast.error('Payment received but confirmation is taking longer than usual. Your account will update shortly.', { id: 'payment-confirm', duration: 6000 });
      } finally {
        navigate('/home', { replace: true });
      }
    };
    handleVerification();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-base text-text-primary">
      <div className="w-12 h-12 border-4 border-smash-purple border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-bold">{status}</h2>
    </div>
  );
};`;

code = code.replace(oldRedirect, newRedirect);

// Remove handlePaymentSuccess and the payment=complete useEffect
// To do this reliably, we'll use a regex
code = code.replace(/const handlePaymentSuccess = async \(txRef: string\) => \{[\s\S]*?\}\s*useEffect\(\(\) => \{[\s\S]*?if \(params\.get\('payment'\) === 'complete'\) \{[\s\S]*?\}\s*\}, \[\]\);/m, "");

// We also need to update the Route tags that pass onTxRef to PaymentRedirect
code = code.replace(/<Route path="\/purchase-success" element=\{<PaymentRedirect onTxRef=\{handlePaymentSuccess\} \/>\} \/>/g, '<Route path="/purchase-success" element={<PaymentRedirect />} />');
code = code.replace(/<Route path="\/tip-success" element=\{<PaymentRedirect onTxRef=\{handlePaymentSuccess\} \/>\} \/>/g, '<Route path="/tip-success" element={<PaymentRedirect />} />');
code = code.replace(/<Route path="\/subscribe-success" element=\{<PaymentRedirect onTxRef=\{handlePaymentSuccess\} \/>\} \/>/g, '<Route path="/subscribe-success" element={<PaymentRedirect />} />');
code = code.replace(/<Route path="\/upgrade-success" element=\{<PaymentRedirect onTxRef=\{handlePaymentSuccess\} \/>\} \/>/g, '<Route path="/upgrade-success" element={<PaymentRedirect />} />');
code = code.replace(/<Route path="\/tier-success" element=\{<PaymentRedirect onTxRef=\{handlePaymentSuccess\} \/>\} \/>/g, '<Route path="/tier-success" element={<PaymentRedirect />} />');
code = code.replace(/<Route path="\/ad-success" element=\{<PaymentRedirect onTxRef=\{handlePaymentSuccess\} \/>\} \/>/g, '<Route path="/ad-success" element={<PaymentRedirect />} />');

fs.writeFileSync('src/App.tsx', code);
