import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Shield, Loader2 } from 'lucide-react'

interface PaymentModalProps {
  checkoutUrl: string
  txRef: string
  onSuccess: (txRef: string) => void
  onClose: () => void
}

export default function PaymentModal({ checkoutUrl, txRef, onSuccess, onClose }: PaymentModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const APP_URL = window.location.origin

  useEffect(() => {
    // Listen for PayChangu postMessage events
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from PayChangu domains
      if (!event.origin.includes('paychangu.com') &&
          !event.origin.includes(APP_URL)) return

      const data = event.data
      console.log('PayChangu message:', data)

      // PayChangu sends status via postMessage on completion
      if (data?.status === 'success' || data?.type === 'payment_success' ||
          data?.event === 'payment.success' || data?.tx_ref === txRef) {
        onSuccess(txRef)
      }
    }

    // Also poll for success by watching iframe URL changes
    const pollInterval = setInterval(() => {
      try {
        const iframeUrl = iframeRef.current?.contentWindow?.location?.href
        if (iframeUrl) {
          if (iframeUrl.includes('payment-success') ||
              iframeUrl.includes('upgrade-success') ||
              iframeUrl.includes('purchase-success') ||
              iframeUrl.includes('tier-success') ||
              iframeUrl.includes('subscribe-success') ||
              iframeUrl.includes('tip-success') ||
              iframeUrl.includes('ad-success')) {
            clearInterval(pollInterval)
            onSuccess(txRef)
          }
          if (iframeUrl.includes('payment-failed')) {
            clearInterval(pollInterval)
            onClose()
          }
        }
      } catch {
        // Cross-origin restriction — normal while on PayChangu domain
      }
    }, 1000)

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(pollInterval)
    }
  }, [txRef, onSuccess, onClose])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{ height: '85vh', maxHeight: '700px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-smash-orange rounded-full flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm uppercase tracking-widest">Secure Payment</p>
                <p className="text-white/30 text-[10px] font-bold">Powered by PayChangu · 256-bit SSL</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white/60" />
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0f0f0f] z-10 mt-[60px]">
              <div className="w-12 h-12 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
              <p className="text-white/40 text-sm font-bold">Loading payment page...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-white font-bold">Failed to load payment page</p>
              <p className="text-white/40 text-sm">Please check your internet connection and try again.</p>
              <button
                onClick={() => { setError(false); setLoading(true); if (iframeRef.current) iframeRef.current.src = checkoutUrl }}
                className="px-6 py-3 bg-smash-orange text-white rounded-xl font-black text-xs uppercase tracking-widest"
              >
                Retry
              </button>
            </div>
          )}

          {/* iframe */}
          <iframe
            ref={iframeRef}
            src={checkoutUrl}
            className="flex-1 w-full border-0"
            style={{ display: error ? 'none' : 'block' }}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true) }}
            allow="payment; camera"
            title="PayChangu Secure Checkout"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
