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
      className="p-8 md:p-12 pb-32 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-8">
         <Link to="/" className="hover:text-white transition-colors">Home</Link>
         <ChevronRight size={14} />
         <span className="text-smash-orange">Terms of Service</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Shield size={32} className="text-smash-orange" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter">Terms of Service</h1>
      </div>
      <p className="text-smash-gray font-medium mb-12">Last Updated: May 25, 2026</p>

      <div className="space-y-12 text-zinc-300 font-medium leading-relaxed bg-zinc-900/30 p-8 md:p-12 rounded-3xl border border-white/5">
        <p className="text-lg text-white">
          Welcome to Smashify! These Terms of Service ("Terms") govern your access to and use of the Smashify website, mobile applications, and streaming services (collectively, the "Platform"). By creating an account or using the Platform, you agree to be bound by these Terms.
        </p>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">1. Description of Service</h2>
          <p className="mb-4">Smashify is a direct-to-fan music streaming and creator management platform.</p>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li>Listeners can access, stream, and subscribe to music tiers, and directly support independent artists.</li>
            <li>Artists/Creators can distribute music, manage content via the Artist Dashboard, and receive direct payments, tips, or subscription revenues.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">2. Eligibility and Account Registration</h2>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li>You must be at least 13 years old to use this Platform (or the minimum legal age in your country).</li>
            <li>You agree to provide accurate, current, and complete information during registration.</li>
            <li>You are solely responsible for safeguarding your account credentials and for any activity under your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">3. Artist Content and Intellectual Property</h2>
          <ul className="list-disc pl-8 space-y-3 text-smash-gray">
            <li><strong className="text-white">Ownership:</strong> Artists retain full ownership of the intellectual property rights in the music, lyrics, artwork, and other content they upload ("User Content").</li>
            <li><strong className="text-white">License to Smashify:</strong> By uploading User Content, you grant Smashify a non-exclusive, worldwide, royalty-free license to stream, host, store, reproduce, and distribute your content solely for the purpose of operating and promoting the Platform.</li>
            <li><strong className="text-white">Copyright Infringement:</strong> Smashify respects intellectual property. If you believe your work has been infringed, please submit a formal DMCA/Takedown notice to our designated agent.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">4. Monetization, Payments, and Tipping</h2>
          <ul className="list-disc pl-8 space-y-3 text-smash-gray">
            <li><strong className="text-white">Revenue Splits:</strong> Smashify facilitates direct-to-fan payments, including subscriptions and digital tipping. Platform fees and processing costs will be deducted as detailed in the Artist Dashboard.</li>
            <li><strong className="text-white">Local Payment Gateways:</strong> Smashify integrates with regional and mobile payment systems. Users agree to abide by the terms of our third-party payment processors.</li>
            <li><strong className="text-white">Refunds:</strong> All listener subscriptions, purchases, and tips are final and non-refundable unless required by local consumer law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">5. Prohibited Conduct</h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li>Upload content that is illegal, defamatory, hateful, or infringes on third-party intellectual property.</li>
            <li>Artificially inflate stream counts or manipulate platform algorithms using bots, scripts, or automated tools.</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">6. Limitation of Liability and Termination</h2>
          <ul className="list-disc pl-8 space-y-2 text-smash-gray">
            <li>Smashify is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms or harm the integrity of the ecosystem.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4">7. Contact Information</h2>
          <p className="text-smash-gray">If you have any questions about these Terms, please contact us at:</p>
          <div className="mt-4 space-y-2 text-white">
            <p><strong>Email:</strong> <a href="mailto:smashfymusic@gmail.com" className="hover:text-smash-orange transition-colors">smashfymusic@gmail.com</a></p>
            <p><strong>Phone / WhatsApp:</strong> <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="hover:text-smash-orange transition-colors">+265 88 372 88 68</a></p>
            <p><strong>Address:</strong> Smashify Ltd., Malawi</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default Terms;
