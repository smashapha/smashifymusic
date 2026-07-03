import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 z-50 bg-[#111] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-start gap-4"
        >
          <div className="w-12 h-12 bg-smash-purple/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="text-smash-purple" size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-bold mb-1">Install Smashify App</h3>
            <p className="text-smash-gray text-xs mb-3">
              Add Smashify to your home screen for a faster, app-like experience.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-smash-purple text-white text-xs font-bold rounded-lg hover:bg-smash-purple/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowPrompt(false)}
            className="text-smash-gray hover:text-white transition-colors absolute top-3 right-3"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
