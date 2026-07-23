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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative z-10 w-full max-w-sm bg-bg-modal border border-border-default rounded-[24px] p-8 text-center shadow-2xl"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-white transition-colors rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 bg-smash-orange/10 rounded-full flex items-center justify-center mx-auto mb-6 text-smash-orange">
                <Headphones size={32} />
              </div>
              
              <h3 className="text-2xl font-studio font-black italic uppercase tracking-tight mb-3">
                Join the <span className="text-smash-orange">Vibe</span>
              </h3>
              
              <p className="text-text-secondary font-medium mb-8">
                {message}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleGoToAuth('listener')}
                  className="w-full py-4 bg-smash-orange text-white rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-smash-orange/20"
                >
                  Log In / Sign Up
                </button>
                <button
                  onClick={() => handleGoToAuth('artist')}
                  className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Mic2 size={16} className="text-smash-purple" /> I'm an Artist
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
