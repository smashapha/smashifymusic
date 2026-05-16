import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, Music2, ArrowRight, Loader2, Heart, Sparkles, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const PaymentSuccess = () => {
  const { refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'pending'>('loading');
  const [details, setDetails] = useState<any>(null);

  const tx_ref = searchParams.get('tx_ref');
  const type = tx_ref?.split('-')[1];
  const urlStatus = searchParams.get('status');

  useEffect(() => {
    if (!tx_ref) {
      navigate('/');
      return;
    }

    if (urlStatus === 'failed' || urlStatus === 'cancelled' || urlStatus === 'error') {
      navigate(`/payment-failed?tx_ref=${tx_ref}`);
      return;
    }

    const pollStatus = async () => {
      let attempts = 0;
      const maxAttempts = 15; // 30 seconds total

      const check = async () => {
        try {
          const { data: txData, error } = await supabase
            .from('transactions')
            .select('status, type, gross_amount, metadata')
            .eq('paychangu_ref', tx_ref)
            .single()

          if (error) {
            console.error('Transaction check error:', error)
            attempts++
            if (attempts >= maxAttempts) {
              setStatus('pending')
              return true
            }
            return false
          }

          if (txData?.status === 'completed') {
            setDetails(txData)
            setStatus('confirmed')
            if (typeof refreshProfile === 'function') {
              await refreshProfile()
            }
            return true
          } else if (txData?.status === 'failed') {
            navigate(`/payment-failed?tx_ref=${tx_ref}`)
            return true
          }
        } catch (e) {
          console.error('Verification error', e)
        }

        attempts++
        if (attempts >= maxAttempts) {
          setStatus('pending')
          return true
        }
        return false
      };

      const interval = setInterval(async () => {
        const done = await check();
        if (done) clearInterval(interval);
      }, 2000);

      return () => clearInterval(interval);
    };

    pollStatus();
  }, [tx_ref, navigate, refreshProfile]);

  const getSuccessContent = () => {
    switch (type) {
      case 'TRACK_PURCHASE':
        return {
          title: 'Music Unlocked!',
          message: 'The track has been added to your library. You now support the creator directly.',
          icon: Music2,
          color: 'text-smash-purple'
        };
      case 'TIP':
        return {
          title: 'Tip Received!',
          message: 'Your generous tip has been sent to the artist. You just made their day!',
          icon: Heart,
          color: 'text-smash-pink'
        };
      case 'FAN_SUBSCRIPTION':
        return {
          title: 'New Supporter!',
          message: 'You are now a monthly supporter. Check your library for exclusive perks.',
          icon: Sparkles,
          color: 'text-smash-orange'
        };
      case 'LISTENER_PREMIUM':
      case 'LISTENER_FAMILY':
        return {
          title: 'Upgrade Complete!',
          message: 'Welcome to the premium experience. Ads are officially gone.',
          icon: CheckCircle2,
          color: 'text-smash-green'
        };
      default:
        return {
          title: 'Payment Successful',
          message: 'Your transaction was processed successfully.',
          icon: CheckCircle2,
          color: 'text-smash-purple'
        };
    }
  };

  const content = getSuccessContent();

  return (
    <div className="min-h-screen bg-smash-black flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-[#111111] border border-white/5 rounded-[48px] p-12 shadow-2xl relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-smash-purple/20 blur-[100px] -z-10" />

        {status === 'loading' ? (
          <div className="space-y-8">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="text-smash-purple animate-spin" size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-studio font-black italic uppercase tracking-tight mb-2">
                Verifying Payment
              </h2>
              <p className="text-smash-gray font-bold text-sm">
                We're confirming your transaction with PayChangu. Hang tight...
              </p>
            </div>
          </div>
        ) : status === 'pending' ? (
          <div className="space-y-8">
            <div className="w-24 h-24 bg-smash-orange/10 rounded-full flex items-center justify-center mx-auto text-smash-orange">
              <Sparkles size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-studio font-black italic uppercase tracking-tight mb-2">
                Almost There
              </h2>
              <p className="text-smash-gray font-bold text-sm mb-8 leading-relaxed">
                Payment is taking a bit longer to confirm. Don't worry—your purchase will appear in your library within a few minutes.
              </p>
              <Link 
                to="/library"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-smash-black font-black uppercase text-xs tracking-widest rounded-full hover:scale-105 transition-transform"
              >
                Go to Library <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className={`w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto ${content.color}`}>
              <content.icon size={48} />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-studio font-black italic uppercase tracking-tighter text-white">
                {content.title}
              </h2>
              <p className="text-smash-gray font-bold text-sm leading-relaxed px-4">
                {content.message}
              </p>
            </div>

            <div className="pt-8 space-y-4">
              <Link 
                to={type?.includes('ARTIST') ? '/artist-hub' : '/library'}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 bg-white text-smash-black font-black uppercase text-xs tracking-widest rounded-full hover:scale-105 transition-transform shadow-xl"
              >
                Continue <ArrowRight size={16} />
              </Link>
              <Link 
                to="/"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-1 text-smash-gray font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors"
              >
                Back to Feed
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
