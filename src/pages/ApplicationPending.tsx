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
    <div className="min-h-screen bg-smash-black flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full p-10 rounded-[40px] bg-white/5 border border-white/10 space-y-8"
      >
        <div className="w-20 h-20 mx-auto rounded-full bg-smash-purple/20 flex items-center justify-center">
          <Clock size={40} className="text-smash-purple animate-pulse" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black font-display italic uppercase tracking-tighter">
            Application<br />
            <span className="text-smash-purple">Under Review</span>
          </h1>
          <p className="text-smash-gray font-bold text-base leading-relaxed">
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
              <Icon size={18} className={done ? 'text-smash-green' : 'text-smash-gray'} />
              <span className={`font-bold text-sm ${done ? 'text-white' : 'text-smash-gray'}`}>{label}</span>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl bg-smash-purple/10 border border-smash-purple/20 flex items-start gap-4 text-left">
          <Mail size={18} className="text-smash-purple mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-smash-gray">
            We'll email you at <span className="text-white">{artistProfile?.email || 'your email'}</span> once approved.
          </p>
        </div>

        <button
          onClick={signOut}
          className="w-full py-4 bg-white/5 border border-white/10 text-smash-gray hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
        >
          Sign Out
        </button>
      </motion.div>
    </div>
  );
};

export default ApplicationPending;
