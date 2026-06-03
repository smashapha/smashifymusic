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
      className="p-8 md:p-12 pb-32 max-w-4xl mx-auto text-white select-none"
    >
      <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-8">
         <Link to="/" className="hover:text-white transition-colors animate-pulse">Home</Link>
         <ChevronRight size={14} />
         <span className="text-smash-orange font-black">Privacy Policy</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <AppLockIcon size={32} className="text-smash-orange animate-bounce" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter text-white">Privacy Policy</h1>
      </div>
      <p className="text-smash-gray font-black uppercase tracking-widest text-xs mb-10">Effective Date: June 3, 2026</p>

      <div className="space-y-10 text-zinc-300 font-medium leading-relaxed bg-zinc-950/40 p-8 md:p-12 rounded-[32px] border border-white/5 shadow-2xl">
        <p className="text-lg text-white font-semibold italic border-l-4 border-smash-orange pl-4 bg-white/5 py-4 rounded-r-xl">
          At Smashify, we value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">1. Information We Collect</h2>
          <div className="space-y-3 text-smash-gray text-sm md:text-base">
            <p>
              <strong className="text-white">Account Information:</strong> When you register, we collect basic details such as your name, email address, phone number, and account password.
            </p>
            <p>
              <strong className="text-white">Content and Usage Data:</strong> For artists, we collect the profile assets, track data, and audio files you upload. For listeners, we collect data regarding your streaming history, playlists, and platform preferences.
            </p>
            <p>
              <strong className="text-white">Payment Information:</strong> When you subscribe or make payments, transaction processing is handled entirely by our secure third-party payment gateways. Smashify does not collect or store your full credit card numbers or mobile money PINs.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">2. How We Use Your Information</h2>
          <p className="text-smash-gray mb-2">We use the collected information to:</p>
          <ul className="list-disc pl-6 space-y-2 text-smash-gray text-sm md:text-base">
            <li>Provide, maintain, and optimize the Smashify streaming service.</li>
            <li>Manage user accounts, verify artist profiles, and process subscription payments.</li>
            <li>Communicate important platform updates, security alerts, and support responses.</li>
            <li>Prevent fraudulent activity, unauthorized uploads, and security breaches.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">3. Data Sharing and Third Parties</h2>
          <p className="text-smash-gray mb-2">
            We do not sell your personal data to third parties. We only share information with trusted third-party services necessary to operate the platform, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-smash-gray text-sm md:text-base">
            <li><strong className="text-white">Authentication Providers:</strong> To manage secure logins and account verification.</li>
            <li><strong className="text-white">Payment Gateways:</strong> To securely process local mobile money and card transactions.</li>
            <li><strong className="text-white">Database and Cloud Hosting:</strong> To securely store application data and audio files (e.g., via Supabase and Vercel infrastructure).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">4. Data Security</h2>
          <p className="text-smash-gray text-sm md:text-base">
            We implement strict industry-standard security measures to protect your personal data against unauthorized access, alteration, or disclosure. This includes using encrypted HTTPS connections for all data transmission. However, please remember that no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">5. Your Rights</h2>
          <p className="text-smash-gray text-sm md:text-base">
            You have the right to access, update, or correct your personal profile information at any time through your account settings. If you wish to permanently delete your Smashify account and delete your data from our systems, you may contact our support team.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">6. Changes to This Policy</h2>
          <p className="text-smash-gray text-sm md:text-base">
            We may update our Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the effective date.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-smash-gray text-xs font-black uppercase tracking-widest mb-2">Privacy or Data Queries?</p>
            <p className="text-smash-gray text-sm">Our Data Protection team is ready to assist you.</p>
          </div>
          <div className="space-y-1.5 text-zinc-400 text-sm">
            <p><strong>Email:</strong> <a href="mailto:smashfymusic@gmail.com" className="text-smash-orange hover:text-white transition-colors">smashfymusic@gmail.com</a></p>
            <p><strong>WA / Call:</strong> <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="text-smash-orange hover:text-white transition-colors">+265 88 372 88 68</a></p>
            <p><strong>Company:</strong> Smashify Ltd., Blantyre, Malawi</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default Privacy;
