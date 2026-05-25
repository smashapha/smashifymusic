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
      <p className="text-smash-gray font-medium mb-12">Last Updated: May 25, 2026</p>

      <div className="space-y-12 text-zinc-300 font-medium leading-relaxed bg-zinc-900/30 p-8 md:p-12 rounded-3xl border border-white/5">
        <p className="text-lg text-white">
          At Smashify, we value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and secure your information.
        </p>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">1. Information We Collect</h2>
          <ul className="list-disc pl-8 space-y-3 text-smash-gray">
            <li><strong className="text-white">Account Information:</strong> Name, email address, username, and profile details provided during registration.</li>
            <li><strong className="text-white">Financial and Payout Data:</strong> For artists and paying subscribers, we collect necessary billing details, mobile money numbers, or bank routing information. This data is securely processed via encrypted third-party integrations.</li>
            <li><strong className="text-white">Usage Data:</strong> IP addresses, device identifiers, browser types, and streaming history (e.g., songs played, artists followed, duration).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">We use the collected data to:</p>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li>Provide, maintain, and optimize the Smashify streaming experience and CI/CD operations.</li>
            <li>Process payments, subscriptions, and distribute artist payouts.</li>
            <li>Deliver tailored content recommendations and analytics to artists regarding listener demographics.</li>
            <li>Comply with legal obligations and prevent fraud or platform abuse.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">3. Data Sharing and Disclosure</h2>
          <p className="mb-4 font-bold text-white">We do not sell your personal data. We share information only in the following scenarios:</p>
          <ul className="list-disc pl-8 space-y-3 text-smash-gray">
            <li><strong className="text-white">With Artists:</strong> Listeners who subscribe to or tip an artist may have basic, non-sensitive data (like username) shared with that artist for community building.</li>
            <li><strong className="text-white">Service Providers:</strong> With trusted third-party vendors handling cloud storage, database management, and mobile payment processing.</li>
            <li><strong className="text-white">Legal Requirements:</strong> If required by law, regulation, or a valid legal process.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">4. Data Security</h2>
          <p>We implement strict administrative and technical security measures to safeguard your information against unauthorized access, loss, or alteration. Financial transactions are encrypted via secure socket layer technology (SSL).</p>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">5. Your Rights and Choices</h2>
          <p className="mb-4">Depending on your location, you may have the right to access, correct, or delete your personal data. You can manage your profile settings, notification preferences, or request account deletion directly through your dashboard settings.</p>
        </section>
      </div>
    </motion.div>
  );
};

export default Privacy;
