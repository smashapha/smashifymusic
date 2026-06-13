import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Shield, ExternalLink, Sparkles, CircleCheck, CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PaymentModalProps {
  checkoutUrl: string
  txRef: string
  onSuccess: (txRef: string) => void
  onClose: () => void
}

export default function PaymentModal({ checkoutUrl, txRef, onSuccess, onClose }: PaymentModalProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [dotCount, setDotCount] = useState(0)

  // Clean the reference in case it has slashes or quotes
  const cleanRef = txRef.trim().replace(/\/$/, '').replace(/^["']|["']$/g, '')

  // Standard dots animation helper
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4)
    }, 600)
    return () => clearInterval(dotsInterval)
  }, [])

  // Real-time Database Status Tracker (Polling)
  useEffect(() => {
    console.log('[PaymentModal] Polling for paychangu_ref:', cleanRef);
    const checkPaymentStatus = async () => {
      try {
        const { data: tx, error } = await supabase
          .from('transactions')
          .select('status')
          .eq('paychangu_ref', cleanRef)
          .maybeSingle()

        if (tx && tx.status === 'completed') {
          setIsCompleted(true)
          setTimeout(() => {
            onSuccess(cleanRef)
          }, 1500)
        }
      } catch (e) {
        console.error('[PaymentModal] Error polling database status:', e)
      }
    }

    // Run immediately on mount
    checkPaymentStatus()

    // Poll every 3 seconds (gentle check rate)
    const pollInterval = setInterval(checkPaymentStatus, 3000)

    return () => clearInterval(pollInterval)
  }, [cleanRef, onSuccess])

  const getDots = () => {
    return '.'.repeat(dotCount)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle cosmic background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-smash-orange/10 blur-[80px] -z-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mt-4 mb-8">
            <div className="w-14 h-14 bg-smash-orange/10 border border-smash-orange/20 rounded-2xl flex items-center justify-center mb-4">
              <Shield size={24} className="text-smash-orange" />
            </div>
            <h3 className="text-lg font-studio font-black italic uppercase tracking-wider text-white">
              Secure Cashier Gateway
            </h3>
            <p className="text-[10px] text-smash-gray font-bold tracking-widest uppercase mt-1">
              Powered by PayChangu · SSL Encrypted
            </p>
          </div>

          {/* Content States */}
          <div className="flex flex-col items-center text-center w-full h-full max-h-[80vh]">
            {!isCompleted ? (
              <div className="w-full flex flex-col items-center">
                <h4 className="text-xl font-bold font-display italic uppercase text-white mb-2">
                  Ready to Pay
                </h4>
                <p className="text-xs text-smash-gray font-bold leading-relaxed max-w-xs text-center mb-6">
                  Tap the button below to open the secure PayChangu payment page. Come back to this screen after paying — it will confirm automatically.
                </p>

                <div className="w-20 h-20 bg-smash-orange/10 border border-smash-orange/20 rounded-full flex items-center justify-center mb-6">
                  <Shield size={36} className="text-smash-orange" />
                </div>

                <button
                  onClick={() => {
                    // Direct user gesture — browser will NOT block this
                    const opened = window.open(checkoutUrl, '_blank');
                    if (!opened) {
                      // True last resort — only if popup is blocked even on direct tap
                      window.location.href = checkoutUrl;
                    }
                  }}
                  className="w-full py-4 bg-smash-orange text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-smash-orange/80 flex items-center justify-center gap-2 mb-4"
                >
                  <ExternalLink size={16} />
                  Open Payment Page
                </button>

                <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest mb-2">
                  Waiting for confirmation{getDots()}
                </p>

                <p className="text-[9px] text-smash-gray font-bold leading-relaxed max-w-sm text-center px-4">
                  Do not close this screen. It will confirm automatically once your payment goes through.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-smash-green/10 border border-smash-green/20 rounded-full flex items-center justify-center mb-6 text-smash-green">
                  <CheckCircle2 size={44} className="animate-bounce" />
                </div>

                <h4 className="text-xl font-bold font-display italic uppercase text-smash-green mb-2">
                  Payment Confirmed!
                </h4>

                <p className="text-xs text-smash-gray font-bold leading-relaxed max-w-xs">
                  Your transaction has been securely processed. Unlocking access and vibes now...
                </p>
              </motion.div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-center items-center gap-2">
            <RefreshCw size={10} className="text-smash-gray animate-spin" />
            <span className="text-[9px] text-smash-gray font-bold uppercase tracking-wider">
              Polled status in real-time
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
