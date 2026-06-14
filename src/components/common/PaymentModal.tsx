import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Shield, ExternalLink, Sparkles, CircleCheck, CheckCircle2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { verifyPayment } from '../../lib/paychangu'

interface PaymentModalProps {
  checkoutUrl: string
  txRef: string
  onSuccess: (txRef: string) => void
  onClose: () => void
}

export default function PaymentModal({ checkoutUrl, txRef, onSuccess, onClose }: PaymentModalProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [dotCount, setDotCount] = useState(0)
  const [pollSeconds, setPollSeconds] = useState(0)
  const [manualChecking, setManualChecking] = useState(false)

  // Clean the reference in case it has slashes or quotes
  const cleanRef = txRef.trim().replace(/\/$/, '').replace(/^["']|["']$/g, '')

  // Timer for manual check fallback
  useEffect(() => {
    const timer = setInterval(() => setPollSeconds(prev => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleManualCheck = async () => {
    setManualChecking(true)
    try {
      const result = await verifyPayment(cleanRef)
      if (result?.status === 'completed') {
        setIsCompleted(true)
        toast.success('Payment confirmed! ✅')
        setTimeout(() => onSuccess(cleanRef), 1200)
      } else if (result?.status === 'failed') {
        toast.error('Payment was not successful. Please try again.')
        onClose()
      } else {
        toast('Still processing — please wait a moment and try again.', { icon: '⏳' })
      }
    } catch (e) {
      toast.error('Could not check status right now. Please try again.')
    } finally {
      setManualChecking(false)
    }
  }

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
          toast.success('Payment confirmed! ✅', { duration: 3000 })
          setTimeout(() => {
            onSuccess(cleanRef)
          }, 1200)
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
        className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-none md:rounded-[40px] p-4 md:p-8 shadow-2xl relative overflow-hidden flex flex-col"
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
          <div className="flex flex-col items-center text-center mt-2 mb-4">
            <div className="w-10 h-10 bg-smash-orange/10 border border-smash-orange/20 rounded-2xl flex items-center justify-center mb-2">
              <Shield size={16} className="text-smash-orange" />
            </div>
            <h3 className="text-base font-studio font-black italic uppercase tracking-wider text-white">
              Secure Cashier Gateway
            </h3>
            <p className="text-[9px] text-smash-gray font-bold tracking-widest uppercase mt-1">
              Powered by PayChangu · SSL Encrypted
            </p>
          </div>

          {/* Content States */}
          <div className="flex flex-col items-center text-center w-full">
            {!isCompleted ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-full bg-white/5 rounded-2xl overflow-hidden border border-white/10 flex-1 min-h-[60vh] md:min-h-[500px] mb-4 relative">
                  <div className="absolute inset-0 flex items-center justify-center -z-10">
                    <div className="w-6 h-6 border-2 border-smash-orange border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <iframe 
                    src={checkoutUrl} 
                    className="w-full h-full border-0 relative z-10 bg-white"
                    title="Secure Payment"
                    allow="payment"
                  />
                </div>

                <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                  <RefreshCw size={10} className="animate-spin text-smash-orange" />
                  Waiting for confirmation{getDots()}
                </p>

                <p className="text-[9px] text-smash-gray font-bold leading-relaxed max-w-sm text-center px-2">
                  Do not close this screen. It will confirm automatically once your payment goes through.
                </p>

                {pollSeconds >= 25 && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-[10px] text-smash-gray text-center max-w-xs">
                      Already paid but nothing happening? Tap below to check manually.
                    </p>
                    <button
                      onClick={handleManualCheck}
                      disabled={manualChecking}
                      className="px-5 py-2.5 bg-smash-orange/10 border border-smash-orange/30 text-smash-orange rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-smash-orange/20 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {manualChecking ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      {manualChecking ? 'Checking...' : 'Check Payment Status'}
                    </button>
                  </div>
                )}
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
