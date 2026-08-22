import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, X } from 'lucide-react';

export const OnboardingChecklist = ({ userProfile, songs, setActiveTab }: { userProfile: any, songs: any[], setActiveTab: (t: any) => void }) => {
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    if (localStorage.getItem('artist_onboarding_dismissed')) {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  const steps = [
    { id: 'profile', label: 'Complete your profile', done: !!userProfile?.stage_name && !!userProfile?.bio, tab: 'profile' },
    { id: 'upload', label: 'Upload your first track', done: songs.length > 0, tab: 'upload' },
    { id: 'payout', label: 'Add payout details', done: !!userProfile?.phone, tab: 'withdraw' },
    { id: 'verify', label: 'Verify your account', done: !!userProfile?.is_verified, tab: 'profile' }
  ];

  const allDone = steps.every(s => s.done);
  if (allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem('artist_onboarding_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 mb-8 relative">
      <button onClick={handleDismiss} className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors">
        <X size={20} />
      </button>
      <h3 className="text-[14px] font-display font-semibold uppercase tracking-widest text-white mb-2">Getting Started</h3>
      <p className="text-sm font-sans text-text-secondary mb-6">Complete these steps to make the most out of your artist profile.</p>
      <div className="space-y-3">
        {steps.map(step => (
          <div key={step.id} className="flex items-center gap-3">
            {step.done ? <CheckCircle size={20} className="text-[#22C55E]" /> : <Circle size={20} className="text-text-muted" />}
            <span className={`text-sm font-sans ${step.done ? 'text-text-muted line-through' : 'text-white'}`}>{step.label}</span>
            {!step.done && (
              <button 
                onClick={() => setActiveTab(step.tab)}
                className="ml-auto text-[11px] font-display font-bold uppercase tracking-wider text-[#00A3FF] hover:text-white transition-colors"
              >
                Go &rarr;
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
