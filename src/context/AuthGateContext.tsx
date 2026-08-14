import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Headphones, X, Mic2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface AuthGateContextType {
  requireAuth: (action: () => void, message?: string) => void;
}

const AuthGateContext = createContext<AuthGateContextType | undefined>(undefined);

export const AuthGateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>('Sign in to continue');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const requireAuth = (action: () => void, customMessage?: string) => {
    if (loading) return; // Prevent action while checking auth
    if (user) {
      action();
    } else {
      setMessage(customMessage || 'Sign in to continue');
      setPendingAction(() => action);
      setIsOpen(true);
    }
  };

  const handleGoToAuth = (role: 'listener' | 'artist') => {
    setIsOpen(false);
    // Include returnTo parameter
    navigate(`/auth/${role}?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
  };

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative z-10 w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[24px] p-8 text-center shadow-2xl"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#B0B0B0] hover:text-white transition-colors rounded-full hover:bg-white/10"
              >
                <X size={18} />
              </button>
              
              <div className="w-14 h-14 bg-[#00A3FF]/15 border border-[#00A3FF]/30 rounded-2xl flex items-center justify-center mx-auto mb-5 text-[#00A3FF]">
                <Headphones size={28} />
              </div>
              
              <h3 className="text-2xl font-bold font-studio tracking-tight text-white mb-2">
                Sign In to <span className="text-[#00A3FF]">Continue</span>
              </h3>
              
              <p className="text-[#B0B0B0] text-[13px] font-normal mb-6 leading-relaxed">
                {message}
              </p>
              
              <div className="space-y-2.5">
                <button
                  onClick={() => handleGoToAuth('listener')}
                  className="w-full h-11 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[10px] font-semibold text-[13px] hover:brightness-110 active:scale-98 transition-all shadow-lg shadow-[#00A3FF]/20"
                >
                  Log In / Sign Up
                </button>
                <button
                  onClick={() => handleGoToAuth('artist')}
                  className="w-full h-11 bg-[#0A0A0A] text-white border border-white/10 rounded-[10px] font-semibold text-[13px] hover:border-[#8B5CF6]/50 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Mic2 size={15} className="text-[#8B5CF6]" /> I'm an Artist
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthGateContext.Provider>
  );
};

export const useRequireAuth = () => {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error('useRequireAuth must be used within an AuthGateProvider');
  }
  return context.requireAuth;
};
