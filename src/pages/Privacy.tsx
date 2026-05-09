import React from 'react';
import { motion } from 'motion/react';
import { Lock as AppLockIcon, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 md:p-12 pb-32 max-w-4xl mx-auto"
    >
        <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-8">
           <Link to="/" className="hover:text-white transition-colors">Home</Link>
           <ChevronRight size={14} />
           <span className="text-smash-orange">Privacy Policy</span>
        </div>

      <div className="flex items-center gap-4 mb-4">
        <AppLockIcon size={32} className="text-smash-orange" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter">Privacy Policy</h1>
      </div>
      <p className="text-smash-gray font-medium mb-12">Effective: 1 January 2026</p>

      <div className="space-y-12 text-zinc-300 font-medium leading-relaxed bg-zinc-900/30 p-8 md:p-12 rounded-3xl border border-white/5">
        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">1. DATA WE COLLECT</h2>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li><strong className="text-white">Account data:</strong> name, email address, phone number</li>
            <li><strong className="text-white">Usage data:</strong> songs played, playlists, purchase history</li>
            <li><strong className="text-white">Device data:</strong> browser type, IP address, operating system</li>
            <li><strong className="text-white">Payment references</strong> (we never store card details)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">2. HOW WE USE YOUR DATA</h2>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li>To provide and improve the Smashify service</li>
            <li>To process payments via PayChangu</li>
            <li>To personalise your music recommendations</li>
            <li>To communicate service updates and offers</li>
            <li>To detect and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">3. DATA SHARING</h2>
          <p className="mb-4 font-bold text-white">We do not sell your personal data.</p>
          <p className="mb-2">We share data only with:</p>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li><strong className="text-white">PayChangu:</strong> for payment processing</li>
            <li><strong className="text-white">Supabase:</strong> secure database hosting</li>
            <li><strong className="text-white">Artists:</strong> play counts and revenue data only — no listener personal data is shared.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">4. DATA RETENTION</h2>
          <p>Your data is retained for as long as your account is active. You may request deletion by emailing privacy@smashify.mw. We will respond within 14 days.</p>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">5. COOKIES</h2>
          <p>We use essential cookies for session authentication only. We do not use advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">6. YOUR RIGHTS</h2>
          <p>Under Malawian data protection principles, you have the right to: access your data, correct inaccuracies, request deletion, and withdraw consent.</p>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">7. SECURITY</h2>
          <p>Data is stored on Supabase, which uses AES-256 encryption at rest and TLS in transit.</p>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">8. CONTACT</h2>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-smash-gray flex items-center gap-3 mt-4">
             <AppLockIcon size={20} className="text-smash-orange" /> <strong className="text-white">Privacy Officer:</strong> privacy@smashify.mw
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default Privacy;
