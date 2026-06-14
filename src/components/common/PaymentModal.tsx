import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PaymentModalProps {
  checkoutUrl: string
  txRef: string
  onSuccess: (txRef: string) => void
  onClose: () => void
}

export default function PaymentModal({ checkoutUrl, txRef, onSuccess, onClose }: PaymentModalProps) {
  const [isCompleted, setIsCompleted] = useState(false)

  // Clean the reference in case it has slashes or quotes
  const cleanRef = txRef.trim().replace(/\/$/, '').replace(/^["']|["']$/g, '')

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

        if (tx && tx.status === 'completed' && !isCompleted) {
          setIsCompleted(true)
          onSuccess(cleanRef)
        }
      } catch (e) {
        console.error('[PaymentModal] Error polling database status:', e)
      }
    }

    // Run immediately on mount
    checkPaymentStatus()

    // Poll every 3 seconds
    const pollInterval = setInterval(checkPaymentStatus, 3000)

    return () => clearInterval(pollInterval)
  }, [cleanRef, onSuccess, isCompleted])

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
          className="w-full h-full md:h-auto md:max-w-3xl md:max-h-[95vh] bg-[#0a0a0a] border border-white/10 rounded-none md:rounded-[40px] p-4 md:p-8 shadow-2xl relative overflow-hidden flex flex-col"
        >
          {/* Subtle cosmic background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-smash-orange/10 blur-[80px] -z-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white z-50"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mt-6 md:mt-2 mb-4">
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
          <div className="flex flex-col items-center text-center w-full flex-1 min-h-0">
            <div className="w-full bg-white/5 rounded-2xl overflow-hidden border border-white/10 flex-1 min-h-[70vh] md:min-h-[600px] relative">
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

