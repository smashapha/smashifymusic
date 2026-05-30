import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { XCircle, RefreshCw, MessageCircle, ArrowLeft } from 'lucide-react';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tx_ref = searchParams.get('tx_ref');

  const type = searchParams.get('type') || ''
  const getRetryPath = () => {
    if (type.includes('LISTENER') || type.includes('ARTIST')) return '/pricing'
    if (type.includes('FAN_SUBSCRIPTION')) return '/'
    return '/pricing'
  }

  return (
    <div className="min-h-screen bg-smash-black flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#111111] border border-white/5 rounded-[48px] p-12 shadow-2xl relative"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 blur-[100px] -z-10" />

        <div className="space-y-8">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-400">
            <XCircle size={48} />
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-studio font-black italic uppercase tracking-tighter text-white">
              Payment Failed
            </h2>
            <p className="text-smash-gray font-bold text-sm leading-relaxed px-4">
              The transaction was not completed. This could be due to insufficient funds, a network error, or the payment being cancelled.
            </p>
            {type && (
              <p className="text-smash-orange text-xs font-black uppercase tracking-widest">
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
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 bg-white text-smash-black font-black uppercase text-xs tracking-widest rounded-full hover:scale-105 transition-transform shadow-xl"
             >
                <RefreshCw size={16} /> Try Again
             </button>
             
             <a 
                href="https://wa.me/265883728868" // Mock support link
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-full hover:bg-white/10 transition-all"
             >
                <MessageCircle size={16} /> Contact Support
             </a>

             <Link 
                to="/"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-1 text-smash-gray font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors"
              >
                <ArrowLeft size={12} /> Back to Smashify
              </Link>
          </div>

          {tx_ref && (
            <div className="pt-6">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
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
