import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic2, Headphones, TrendingUp, 
  Check, ChevronDown, ChevronUp, Compass, Heart,
  ShieldCheck, Infinity, Download, LayoutDashboard,
  Smartphone, User
} from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';

const PricingCard = ({ title, price, features, badge, onAction, period = 'mo' }: any) => (
  <div className={`bento-card bg-smash-dark/50 border-white/5 p-10 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all ${badge ? 'ring-2 ring-smash-orange' : ''}`}>
    {badge && (
      <div className="absolute top-6 right-0 bg-smash-orange text-white text-[10px] font-black px-4 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg z-10">
        {badge}
      </div>
    )}
    <h3 className="text-2xl font-black font-display italic uppercase mb-2">{title}</h3>
    <div className="flex items-baseline gap-2 mb-8">
      <span className="text-sm font-black text-smash-gray uppercase tracking-widest">MK</span>
      <span className="text-5xl font-black font-display italic">{price}</span>
      <span className="text-sm font-black text-smash-gray uppercase tracking-widest">/{period}</span>
    </div>
    <ul className="space-y-4 mb-10 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-3 text-smash-gray font-bold group-hover:text-white transition-colors">
          <Check size={18} className="text-smash-orange flex-shrink-0 mt-0.5" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onAction}
      className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all ${badge ? 'bg-smash-orange text-white' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white'}`}
    >
      GET STARTED
    </button>
  </div>
);

const FAQItem = ({ question, answer }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-8 flex items-center justify-between text-left group"
      >
        <span className="text-xl md:text-2xl font-black font-display italic uppercase tracking-tight group-hover:text-smash-orange transition-colors">{question}</span>
        {isOpen ? <ChevronUp className="text-smash-orange" /> : <ChevronDown className="text-smash-gray" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-8 text-smash-gray text-lg font-medium leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-smash-black text-white selection:bg-smash-orange/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-smash-black/10 backdrop-blur-xl border-b border-white/5">
        <Logo size="md" className="cursor-pointer group" onClick={() => navigate('/')} />
        <div className="flex items-center gap-4 md:gap-8">
          <button onClick={() => navigate('/auth/listener')} className="hidden md:block text-xs font-black text-smash-gray hover:text-white uppercase tracking-widest transition-colors">Log In</button>
          <button 
            onClick={() => navigate('/auth/listener?mode=signup')} 
            className="px-8 py-3 bg-white text-smash-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all transform hover:-translate-y-1 shadow-xl shadow-white/5"
          >
            Sign Up Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 md:px-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-smash-orange/20 rounded-full blur-[140px] -mr-64 -mt-32 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-smash-red/10 rounded-full blur-[140px] -ml-64 -mb-32" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black text-smash-orange mb-10 shadow-inner">
              <span className="tracking-widest uppercase italic"><i className="fas fa-fire mr-2"></i> #1 Malawi Music Platform</span>
            </div>
            <h1 className="text-7xl md:text-[120px] font-black font-display leading-[0.85] tracking-tighter mb-8 flex flex-col uppercase italic">
              Stream Music.<br/>
              <span className="text-smash-orange">Support Artists.</span>
            </h1>
            <p className="text-2xl text-smash-gray max-w-xl mb-12 leading-relaxed font-semibold">
              The first streaming platform built for Malawian artists & fans. Stream free, buy songs directly — artists keep 90% of every sale.
            </p>
            <div className="flex flex-wrap gap-5">
              <button 
                 onClick={() => navigate('/auth/listener?mode=signup')}
                 className="px-10 py-5 bg-white text-smash-black rounded-full font-black text-sm md:text-lg uppercase tracking-widest flex items-center gap-3 hover:bg-smash-orange hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
              >
                Start Listening Free <Headphones size={24} />
              </button>
              <button 
                 onClick={() => navigate('/artists')}
                 className="px-10 py-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full font-black text-sm md:text-lg uppercase tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all border-b-4 border-b-white/5 active:border-b-0 active:translate-y-1"
              >
                For Artists <Mic2 size={24} />
              </button>
            </div>

            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                   <p className="text-3xl font-black font-display italic text-white mb-1">10K+</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Listeners</p>
                </div>
                <div>
                   <p className="text-3xl font-black font-display italic text-smash-orange mb-1">500+</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Songs</p>
                </div>
                <div>
                   <p className="text-3xl font-black font-display italic text-white mb-1">90%</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Artist Payout</p>
                </div>
                <div>
                   <p className="text-3xl font-black font-display italic text-smash-green mb-1">Free</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">To Stream</p>
                </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 bento-card aspect-square max-w-[550px] mx-auto p-0 overflow-hidden group shadow-[0_0_120px_rgba(255,95,0,0.15)] rounded-[60px] border-white/5">
              <img 
                src="https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000&h=1000&fit=crop" 
                className="w-full h-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-[20s]" 
                alt="" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-smash-black via-smash-black/40 to-transparent opacity-80" />
              <div className="absolute bottom-12 left-12 right-12 glass-morphism p-8 rounded-[40px] border border-white/10 shadow-2xl">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-smash-orange rounded-2xl flex items-center justify-center shadow-lg shadow-smash-orange/30">
                          <Headphones className="text-white" size={28} />
                       </div>
                       <div>
                          <p className="text-xs uppercase font-black text-smash-gray tracking-[0.2em] mb-1">NOW PLAYING</p>
                          <p className="font-display font-black text-2xl italic tracking-tight uppercase leading-none">Malawian Hits</p>
                       </div>
                    </div>
                 </div>
                 <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ x: ['-100%', '100%'] }} 
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} 
                      className="w-1/2 h-full bg-smash-orange" 
                    />
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20 px-6 md:px-12 bg-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bento-card bg-smash-dark/50 border-white/5 p-12 hover:border-smash-orange/30 transition-all">
            <div className="w-16 h-16 bg-smash-purple/20 text-smash-purple rounded-2xl flex items-center justify-center mb-8">
              <Compass size={32} />
            </div>
            <h2 className="text-4xl font-black font-display italic uppercase mb-6">Our Vision</h2>
            <p className="text-smash-gray text-xl leading-relaxed font-semibold">
              To create a music ecosystem where Malawian artists thrive and fans directly power the industry they love.
            </p>
          </div>
          <div className="bento-card bg-smash-dark/50 border-white/5 p-12 hover:border-smash-cyan/30 transition-all">
            <div className="w-16 h-16 bg-smash-cyan/20 text-smash-cyan rounded-2xl flex items-center justify-center mb-8">
              <TrendingUp size={32} />
            </div>
            <h2 className="text-4xl font-black font-display italic uppercase mb-6">Our Mission</h2>
            <p className="text-smash-gray text-xl leading-relaxed font-semibold">
              A fair, transparent platform where artists keep 90% of earnings and fans enjoy unlimited access to local music.
            </p>
          </div>
        </div>
      </section>

      {/* Why Smashify */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-24">
              <h2 className="text-5xl md:text-8xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">WHY <span className="text-smash-orange">SMASHIFY?</span></h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bento-card bg-white/5 p-10 group hover:-translate-y-2 transition-all">
                 <Infinity className="text-smash-orange mb-6" size={40} />
                 <h3 className="text-2xl font-black font-display italic uppercase mb-4">Free Streaming</h3>
                 <p className="text-smash-gray font-semibold leading-relaxed">Listen to all Malawian hits — no subscription required to stream.</p>
              </div>
              <div className="bento-card bg-white/5 p-10 group hover:-translate-y-2 transition-all">
                 <Heart className="text-smash-red mb-6" size={40} />
                 <h3 className="text-2xl font-black font-display italic uppercase mb-4">Direct Support</h3>
                 <p className="text-smash-gray font-semibold leading-relaxed">Buy songs & send donations directly via Airtel Money or TNM Mpamba.</p>
              </div>
              <div className="bento-card bg-white/5 p-10 group hover:-translate-y-2 transition-all">
                 <Download className="text-smash-cyan mb-6" size={40} />
                 <h3 className="text-2xl font-black font-display italic uppercase mb-4">Offline Mode</h3>
                 <p className="text-smash-gray font-semibold leading-relaxed">Download songs with Premium. Listen anywhere, anytime.</p>
              </div>
              <div className="bento-card bg-white/5 p-10 group hover:-translate-y-2 transition-all">
                 <Smartphone className="text-smash-purple mb-6" size={40} />
                 <h3 className="text-2xl font-black font-display italic uppercase mb-4">Install as App</h3>
                 <p className="text-smash-gray font-semibold leading-relaxed">Install Smashify on your phone like a native app — no app store needed.</p>
              </div>
              <div className="bento-card bg-white/5 p-10 group hover:-translate-y-2 transition-all">
                 <LayoutDashboard className="text-smash-green mb-6" size={40} />
                 <h3 className="text-2xl font-black font-display italic uppercase mb-4">Smart Queue</h3>
                 <p className="text-smash-gray font-semibold leading-relaxed">Shuffle, repeat, feed view, crossfade & full player controls built in.</p>
              </div>
              <div className="bento-card bg-white/5 p-10 group hover:-translate-y-2 transition-all">
                 <ShieldCheck className="text-white mb-6" size={40} />
                 <h3 className="text-2xl font-black font-display italic uppercase mb-4">Artist First</h3>
                 <p className="text-smash-gray font-semibold leading-relaxed">90% payouts, transparent earnings, same-day withdrawals via mobile money.</p>
              </div>
           </div>
        </div>
      </section>

      {/* Artist CTA */}
      <section className="py-24 px-6 md:px-12 bg-smash-orange/10 border-y border-smash-orange/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-smash-orange/20 blur-[100px] rounded-full mix-blend-screen" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Mic2 className="mx-auto text-smash-orange mb-8" size={64} />
          <h2 className="text-5xl md:text-7xl font-black font-display italic uppercase mb-8">Are You an Artist?</h2>
          <p className="text-xl md:text-2xl text-white max-w-2xl mx-auto mb-12 font-semibold">
            Upload your music, set your price, and earn directly from your fans. Keep 90% of every sale and donation. Apply today and join Malawi's music revolution.
          </p>
          <button 
            onClick={() => navigate('/pricing?tab=artists')}
            className="px-12 py-6 bg-smash-orange text-white rounded-full font-black text-xl uppercase tracking-widest shadow-[0_0_40px_rgba(255,107,0,0.4)] hover:bg-orange-600 transition-all hover:scale-105 active:scale-95"
          >
            Apply as Artist
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 md:px-12 bg-gradient-to-b from-smash-black to-smash-dark/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
             <h2 className="text-5xl md:text-8xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">FAIR <span className="text-smash-orange">PRICING</span></h2>
             <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">Everything starts free. Upgrade when you're ready.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
             <PricingCard 
                title="Free" 
                price="0" 
                onAction={() => navigate('/auth/listener?mode=signup')}
                features={[
                  "Ad-supported streaming (128kbps)", 
                  "6 skips per hour", 
                  "Buy tracks & send tips",
                  "Fan subscriptions",
                  "Limited queue management"
                ]} 
             />
             <PricingCard 
                title="Premium" 
                price="750" 
                badge="MOST POPULAR"
                onAction={() => navigate('/auth/listener?mode=signup')}
                features={[
                  "Ad-free listening", 
                  "High quality audio (320kbps)", 
                  "Offline saves (50 songs)",
                  "Unlimited skips & downloads",
                  "Lyrics display & Listening stats",
                  "Early access to content"
                ]} 
             />
             <PricingCard 
                title="Family" 
                price="3,500" 
                onAction={() => navigate('/auth/listener?mode=signup')}
                features={[
                  "5 Premium accounts included", 
                  "Ad-free listening for everyone",
                  "Offline saves (50 songs/account)",
                  "Unlimited skips & downloads",
                  "Individual listening stats",
                  "One simple monthly bill"
                ]} 
             />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 md:px-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
          <div className="space-y-6">
            <Logo size="lg" />
            <p className="text-smash-gray text-base max-w-sm font-medium leading-relaxed">The #1 music streaming platform built for Malawi. Stream free, support artists.</p>
            <div className="flex gap-4">
               {['ig', 'fb', 'tw', 'tk'].map(s => (
                 <div key={s} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-smash-gray hover:text-smash-orange hover:bg-white/10 transition-all cursor-pointer uppercase font-black text-[10px]">
                   {s}
                 </div>
               ))}
            </div>
          </div>
          
          <div className="space-y-6 flex flex-col">
             <h4 className="text-lg font-black font-display uppercase italic tracking-[0.1em] text-white">Platform</h4>
             <button onClick={() => navigate('/discover')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Discover</button>
             <button onClick={() => navigate('/pricing')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Premium Plans</button>
             <button onClick={() => navigate('/library')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Library</button>
          </div>

          <div className="space-y-6 flex flex-col">
             <h4 className="text-lg font-black font-display uppercase italic tracking-[0.1em] text-white">Artists</h4>
             <button onClick={() => navigate('/artists')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Artist Portal</button>
             <button onClick={() => navigate('/artists')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Apply as Artist</button>
          </div>

          <div className="space-y-6 flex flex-col">
             <h4 className="text-lg font-black font-display uppercase italic tracking-[0.1em] text-white">Company</h4>
             <button onClick={() => navigate('/about')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">About Us</button>
             <button onClick={() => navigate('/contact')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Contact</button>
             <button onClick={() => navigate('/privacy')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Privacy Policy</button>
             <button onClick={() => navigate('/terms')} className="text-left text-smash-gray hover:text-smash-orange font-bold transition-colors">Terms of Service</button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col items-center justify-center gap-4 text-center">
           <p className="text-sm font-bold text-smash-gray">
              <Heart className="inline text-smash-red" size={14} /> © {new Date().getFullYear()} Smashify. Built in Blantyre, Malawi.
           </p>
           <p className="text-xs font-bold text-smash-orange uppercase tracking-widest">Artists keep 90% of every sale.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
