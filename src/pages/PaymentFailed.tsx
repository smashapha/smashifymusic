import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from "motion/react";
import { XCircle, RefreshCw, MessageCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { verifyPayment } from '../lib/paychangu';
import toast from 'react-hot-toast';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tx_ref = searchParams.get('app_ref') || searchParams.get('tx_ref') || searchParams.get('reference');

  const type = searchParams.get('type') || ''
  const [isVerifying, setIsVerifying] = useState(false);

  const handleReVerify = async () => {
    if (!tx_ref) return;
    setIsVerifying(true);
    toast.loading('Checking PayChangu for actual payment status...', { id: 'verify-toast' });
    try {
      const res = await verifyPayment(tx_ref);
      if (res && res.status === 'completed') {
        toast.success('Payment was actually successful! Redirecting...', { id: 'verify-toast' });
        setTimeout(() => navigate('/home'), 2000);
      } else {
        toast.error('Payment is still marked as failed or incomplete.', { id: 'verify-toast' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify payment', { id: 'verify-toast' });
    } finally {
      setIsVerifying(false);
    }
  };

  const getRetryPath = () => {
    if (type.includes('LISTENER') || type.includes('ARTIST')) return '/pricing'
    if (type.includes('FAN_SUBSCRIPTION')) return '/'
    return '/pricing'
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#1A1A1A] border border-white/10 rounded-[16px] p-8 shadow-2xl relative"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FF453A]/10 blur-[100px] -z-10" />

        <div className="space-y-8">
          <div className="w-24 h-24 bg-[#FF453A]/10 rounded-full flex items-center justify-center mx-auto text-[#FF453A]">
            <XCircle size={48} />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-white">
              Payment Failed
            </h2>
            <p className="text-[#B0B0B0] text-sm leading-relaxed px-4">
              The transaction was not completed. This could be due to insufficient funds, a network error, or the payment being cancelled.
            </p>
            {type && (
              <p className="text-[#FF453A] text-xs font-semibold">
                {type.includes('LISTENER_PREMIUM') ? 'Premium Subscription Failed' :
                 type.includes('LISTENER_FAMILY') ? 'Family Plan Failed' :
                 type.includes('ARTIST') ? 'Artist Tier Payment Failed' :
                 type.includes('TRACK') ? 'Track Purchase Failed' :
                 'Payment Failed'}
              </p>
            )}
          </div>

          <div className="pt-8 space-y-4">
             <button 
                onClick={() => navigate(getRetryPath())}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 bg-[#0084D6] hover:bg-[#0084D6]/90 text-white font-semibold text-sm rounded-[10px] transition-all"
             >
                <RefreshCw size={16} /> Try Again
             </button>

             {tx_ref && (
               <button 
                  onClick={handleReVerify}
                  disabled={isVerifying}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 bg-[#00A3FF]/10 text-[#00A3FF] font-semibold text-sm rounded-[10px] hover:bg-[#00A3FF]/15 transition-all border border-[#00A3FF]/20"
               >
                  <CheckCircle size={16} /> {isVerifying ? 'Checking...' : 'I paid, re-verify status'}
               </button>
             )}
             
             <a 
                href="https://wa.me/265883728868" // Mock support link
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 bg-white/5 border border-white/10 text-white font-semibold text-sm rounded-[10px] hover:bg-white/10 transition-all"
             >
                <MessageCircle size={16} /> Contact Support
             </a>

             <Link 
                to="/"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-1 text-[#B0B0B0] font-medium text-xs hover:text-white transition-colors"
              >
                <ArrowLeft size={12} /> Back to Smashify
              </Link>
          </div>

          {tx_ref && (
            <div className="pt-6">
              <p className="text-[10px] font-semibold text-white/20 tracking-[0.3em]">
                Ref: {tx_ref}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentFailed;
