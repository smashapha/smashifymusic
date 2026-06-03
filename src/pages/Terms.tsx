import React from 'react';
import { motion } from 'motion/react';
import { Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
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
         <span className="text-smash-orange font-black">Terms of Service</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Shield size={32} className="text-smash-orange animate-bounce" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter text-white">Terms of Service</h1>
      </div>
      <p className="text-smash-gray font-black uppercase tracking-widest text-xs mb-10">Effective Date: June 3, 2026</p>

      <div className="space-y-10 text-zinc-300 font-medium leading-relaxed bg-zinc-950/40 p-8 md:p-12 rounded-[32px] border border-white/5 shadow-2xl">
        <p className="text-lg text-white font-semibold italic border-l-4 border-smash-orange pl-4 bg-white/5 py-4 rounded-r-xl">
          Welcome to Smashify! By accessing or using our platform, website, and services, you agree to comply with and be bound by these Terms of Service. Please read them carefully.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">1. Acceptance of Terms</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify is a digital music platform that connects musical artists with listeners. By creating an account, uploading music, or streaming content, you enter into a legally binding agreement with Smashify. If you do not agree to these terms, you may not use the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">2. User Accounts</h2>
          <div className="space-y-3 text-smash-gray text-sm md:text-base">
            <p>
              <strong className="text-white">Eligibility:</strong> You must be at least 18 years old, or have the consent of a parent or legal guardian, to create an account.
            </p>
            <p>
              <strong className="text-white">Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials (passwords) and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">3. Artist Uploads and Intellectual Property</h2>
          <div className="space-y-3 text-smash-gray text-sm md:text-base">
            <p>
              <strong className="text-white">Ownership:</strong> Artists retain 100% ownership of the copyright to the musical works, lyrics, and audio files they upload to Smashify.
            </p>
            <p>
              <strong className="text-white">Licensing to Smashify:</strong> By uploading content, you grant Smashify a non-exclusive, worldwide, royalty-free license to stream, host, store, and distribute your music to users on the platform.
            </p>
            <p>
              <strong className="text-white">Content Guarantees:</strong> You guarantee that you own or control all rights to the music you upload, and that your content does not infringe upon the intellectual property rights, copyrights, or privacy of any third party.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">4. Monetization and Subscriptions</h2>
          <div className="space-y-3 text-smash-gray text-sm md:text-base">
            <p>
              <strong className="text-white">Subscription Tiers:</strong> Smashify offers tiered subscription plans for listeners and varied upload plans for artists (e.g., Upcoming, Standard, and Pro tiers). By subscribing to a plan, you agree to pay the specified recurring fees.
            </p>
            <p>
              <strong className="text-white">Payments:</strong> All financial transactions, subscription fees, and payouts are processed securely through our integrated local payment gateways (such as PayChangu or Flutterwave). Smashify does not directly store your mobile money or card details.
            </p>
            <p>
              <strong className="text-white">Payouts:</strong> Artist earnings from fan support or streams will be distributed according to the specific terms of the artist's selected upload tier, subject to standard processing fees.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">5. Prohibited Conduct</h2>
          <p className="text-smash-gray text-sm md:text-base">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2 text-smash-gray text-sm md:text-base">
            <li>Upload, share, or stream any content that is unlawful, harmful, defamatory, or infringes on copyrights.</li>
            <li>Attempt to reverse-engineer, hack, or disrupt the security and functionality of the Smashify platform.</li>
            <li>Use automated bots or scripts to artificially inflate stream counts or manipulate platform data.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">6. Limitation of Liability</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service. Smashify shall not be liable for any indirect, incidental, or consequential damages resulting from your use or inability to use the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">7. Governing Law</h2>
          <p className="text-smash-gray text-sm md:text-base">
            These Terms of Service are governed by and construed in accordance with the laws of the Republic of Malawi. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of Malawi.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-smash-gray text-xs font-black uppercase tracking-widest mb-2">Have questions?</p>
            <p className="text-smash-gray text-sm">Please reach out to the Smashify support team.</p>
          </div>
          <div className="space-y-1.5 text-zinc-400 text-sm">
            <p><strong>Email:</strong> <a href="mailto:smashfymusic@gmail.com" className="text-smash-orange hover:text-white transition-colors">smashfymusic@gmail.com</a></p>
            <p><strong>WA / Call:</strong> <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="text-smash-orange hover:text-white transition-colors">+265 88 372 88 68</a></p>
            <p><strong>Location:</strong> Smashify Ltd., Blantyre, Malawi</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default Terms;
