import React, { useEffect } from 'react';
import { motion } from "motion/react";
import { Clock, CheckCircle, Mail, Mic2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';

const ApplicationPending: React.FC = () => {
  const { artistProfile, role, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'artist') navigate('/artist-hub');
    if (role === 'listener') navigate('/');
  }, [role, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full p-10 rounded-[40px] bg-white/5 border border-white/10 space-y-8"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-[#00A3FF]/20 flex items-center justify-center">
          <Clock size={40} className="text-[#00A3FF] animate-pulse" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold font-display tracking-tight">
            Application<br />
            <span className="text-[#00A3FF]">Under Review</span>
          </h1>
          <p className="text-[#B0B0B0] font-bold text-base leading-relaxed">
            Hey <span className="text-white">{artistProfile?.stage_name || artistProfile?.full_name || 'Artist'}</span>!
            Your application has been submitted. We review within 24–48 hours.
          </p>
        </div>

        <div className="space-y-4 text-left">
          {[
            { icon: CheckCircle, label: 'Application submitted', done: true },
            { icon: Clock, label: 'Admin review (24–48 hrs)', done: false },
            { icon: CheckCircle, label: 'Profile added to artists table', done: false },
            { icon: Mic2, label: 'Studio unlocked — start uploading!', done: false },
          ].map(({ icon: Icon, label, done }) => (
            <div key={label} className="flex items-center gap-4">
              <Icon size={18} className={done ? 'text-smash-green' : 'text-[#B0B0B0]'} />
              <span className={`font-bold text-sm ${done ? 'text-white' : 'text-[#B0B0B0]'}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl bg-[#00A3FF]/10 border border-[#00A3FF]/20 flex items-start gap-4 text-left">
          <Mail size={18} className="text-[#00A3FF] mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-[#B0B0B0]">
            We'll email you at <span className="text-white">{artistProfile?.email || 'your email'}</span> once approved.
          </p>
        </div>

        <button
          onClick={signOut}
          className="w-full py-4 bg-white/5 border border-white/10 text-[#B0B0B0] hover:text-white rounded-2xl font-semibold text-xs transition-colors"
        >
          Sign out
        </button>
      </motion.div>
    </div>
  );
};

export default ApplicationPending;
