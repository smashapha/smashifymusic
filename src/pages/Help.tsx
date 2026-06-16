import React from 'react';
import { motion } from 'motion/react';
import { LifeBuoy, ChevronRight, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const Help = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 md:p-12 pb-32 max-w-4xl mx-auto items-center"
    >
      <div className="flex items-center gap-3 text-sm font-bold text-text-muted uppercase tracking-widest mb-8">
         <Link to="/" className="hover:text-white transition-colors">Home</Link>
         <ChevronRight size={14} />
         <span className="text-smash-orange">Help & Support</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <LifeBuoy size={32} className="text-smash-orange" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter">Help Center</h1>
      </div>
      <p className="text-xl text-text-muted font-medium mb-12 border-b border-white/10 pb-8">
        Need assistance with Smashify? We're here to help you get the most out of our platform.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
         <div className="bg-bg-surface p-8 rounded-3xl border border-border-default hover:border-smash-orange/30 transition-all flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-smash-orange/20 rounded-full flex items-center justify-center text-smash-orange mb-6 shadow-inner">
             <MessageSquare size={32} />
           </div>
           <h3 className="text-2xl font-bold text-text-primary mb-2">WhatsApp Support</h3>
           <p className="text-text-secondary mb-8 text-sm flex-1">Chat with our support team directly. We are online to help with payouts, uploads, and account issues.</p>
           <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 bg-smash-orange text-white rounded-full font-bold text-[13px] uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_20px_rgba(255,95,0,0.2)]">
             Chat on WhatsApp
           </a>
         </div>

         <div className="bg-bg-surface p-8 rounded-3xl border border-border-default hover:border-smash-purple/30 transition-all flex flex-col items-center text-center">
           <div className="w-16 h-16 bg-smash-purple/20 rounded-full flex items-center justify-center text-smash-purple mb-6 shadow-inner">
             <Mail size={32} />
           </div>
           <h3 className="text-2xl font-bold text-text-primary mb-2">Email Support</h3>
           <p className="text-text-secondary mb-8 text-sm flex-1">Send us an email for more detailed inquiries, business partnerships, or copyright claims.</p>
           <a href="mailto:smashfymusic@gmail.com" className="inline-block px-8 py-4 bg-smash-purple text-white rounded-full font-bold text-[13px] uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_20px_rgba(168,85,247,0.2)]">
             Email Us
           </a>
         </div>
      </div>

      <div className="bg-bg-surface p-8 md:p-12 rounded-3xl border border-border-default shadow-sm">
        <h2 className="text-3xl font-black font-display uppercase tracking-tighter text-white mb-10 text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="border-b border-white/5 pb-6">
            <h4 className="font-bold text-white text-lg mb-3">How do I get paid?</h4>
            <p className="text-text-secondary leading-relaxed">Payouts are sent directly to your Airtel Money or TNM Mpamba wallet. The minimum withdrawal is MK 10,000, and processing time depends on your Studio Tier (Instant for Elite members!).</p>
          </div>
          <div className="border-b border-white/5 pb-6">
            <h4 className="font-bold text-white text-lg mb-3">Can fans listen for free?</h4>
            <p className="text-text-secondary leading-relaxed">Yes, fans can stream music for free! You make money when fans purchase tracks, drop tips, or subscribe to your exclusive fan tier.</p>
          </div>
          <div className="pb-4">
            <h4 className="font-bold text-white text-lg mb-3">How long does my application take?</h4>
            <p className="text-text-secondary leading-relaxed">Artist reviews usually take 24–48 hours, but if you upgrade to a paid Studio plan (Rising Star, Standard, or Elite), you get instant approval and can upload immediately!</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Help;
