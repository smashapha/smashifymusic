import React from 'react';
import { motion } from 'motion/react';
import { Info, ChevronRight, Music, Heart, BarChart, Globe, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 md:p-12 pb-32 max-w-5xl mx-auto"
    >
        <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-8">
           <Link to="/" className="hover:text-white transition-colors">Home</Link>
           <ChevronRight size={14} />
           <span className="text-smash-orange">About Us</span>
        </div>

      <div className="flex items-center gap-4 mb-4">
        <Info size={32} className="text-smash-orange" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter">About Smashify</h1>
      </div>
      <p className="text-xl text-smash-gray font-medium mb-12 max-w-2xl leading-relaxed">
        A music ecosystem where African artists earn fairly, fans support directly, and money stays on the continent.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
         <div className="bg-zinc-900/30 p-8 md:p-12 rounded-3xl border border-white/5">
           <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-6">Our Story</h2>
           <div className="space-y-4 text-zinc-300 font-medium leading-relaxed">
             <p>
               Smashify started in Malawi with a simple belief: African artists deserve to be paid by their fans directly. We are starting in Malawi and expanding across Africa — because every market on this continent has artists with talent and fans willing to pay. They just need the right platform.
             </p>
             <p>
               Global streaming platforms pay between $0.003 and $0.005 per stream. An artist with 100,000 streams earns less than $500. They don't support local mobile money. They don't pay out via Airtel or TNM. They don't understand the local landscape.
             </p>
             <p className="text-white font-bold text-xl italic mt-6">
               We built Smashify to fix that.
             </p>
           </div>
         </div>

         <div className="bg-zinc-900/30 p-8 md:p-12 rounded-3xl border border-white/5 relative overflow-hidden">
           <div className="absolute -top-10 -right-10 opacity-5">
             <Heart size={200} />
           </div>
           <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-6 relative z-10">Our Values</h2>
           <div className="space-y-6 relative z-10">
             <div className="flex gap-4 items-start">
               <DollarSign size={24} className="text-smash-orange shrink-0 mt-1" />
               <div>
                 <h3 className="font-bold text-white mb-1">Fair Pay</h3>
                 <p className="text-smash-gray text-sm font-medium">Artists keep up to 95% of every sale and donation.</p>
               </div>
             </div>
             <div className="flex gap-4 items-start">
               <BarChart size={24} className="text-smash-orange shrink-0 mt-1" />
               <div>
                 <h3 className="font-bold text-white mb-1">Transparency</h3>
                 <p className="text-smash-gray text-sm font-medium">Every MWK is tracked, visible, auditable.</p>
               </div>
             </div>
             <div className="flex gap-4 items-start">
               <Globe size={24} className="text-smash-orange shrink-0 mt-1" />
               <div>
                 <h3 className="font-bold text-white mb-1">Local First</h3>
                 <p className="text-smash-gray text-sm font-medium">Built in Malawi, expanding across Africa.</p>
               </div>
             </div>
             <div className="flex gap-4 items-start">
               <Heart size={24} className="text-smash-orange shrink-0 mt-1" />
               <div>
                 <h3 className="font-bold text-white mb-1">Community</h3>
                 <p className="text-smash-gray text-sm font-medium">Artists and fans growing together.</p>
               </div>
             </div>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bento-card border-smash-orange/20 relative overflow-hidden group p-8 md:p-12">
          <div className="absolute -bottom-10 -right-10 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
             <Music size={150} />
          </div>
          <h3 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4 relative z-10">For Artists</h3>
          <p className="text-smash-gray font-medium leading-relaxed relative z-10">
            Upload your music. Set your price. Keep up to 95%. Withdraw to Airtel Money or TNM Mpamba within minutes. Track every stream with real analytics. Build a real fanbase.
          </p>
        </div>
        
        <div className="bento-card relative overflow-hidden group p-8 md:p-12">
          <div className="absolute -bottom-10 -right-10 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Heart size={150} />
          </div>
          <h3 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-4 relative z-10">For Listeners</h3>
          <p className="text-smash-gray font-medium leading-relaxed relative z-10">
            Stream free. Discover authentic African music. Buy tracks you love. Donate directly to artists. Know your money reaches them.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-smash-orange to-smash-red rounded-3xl p-8 md:p-12 mb-16 shadow-[0_0_100px_rgba(255,95,0,0.2)] text-white">
        <h2 className="text-3xl font-black font-display italic uppercase text-center mb-12">The Numbers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-2">50k+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-sm text-balance">Registered Listeners</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-2">200+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-sm text-balance">Verified Artists</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-2">1M+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-sm text-balance">Songs Streamed</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-2">MK 5M+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-sm text-balance">Paid to Artists</div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 p-8 md:p-12 rounded-3xl border border-white/5 text-center">
        <h2 className="text-2xl font-black font-display uppercase tracking-tighter text-white mb-6">Contact Us</h2>
        <div className="flex flex-col items-center gap-4 text-smash-gray font-medium">
          <p className="flex items-center justify-center gap-2 flex-wrap"><strong className="text-white">Email:</strong> hello@smashify.mw | support@smashify.mw</p>
          <p className="flex items-center justify-center gap-2 flex-wrap"><strong className="text-white">Address:</strong> Smashify Ltd., Livingstone Towers, Blantyre, Malawi</p>
        </div>
      </div>
    </motion.div>
  );
};

export default About;
