import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Mic2, Smartphone, DollarSign, Zap, Headphones, Globe, 
  ArrowRight, Music, Users, BarChart3, Heart, Flame, TrendingUp, 
  Check, Star, ShieldCheck, ChevronDown, ChevronUp, Compass
} from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';

const PricingCard = ({ title, price, features, badge, color = 'white' }: any) => (
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
      <span className="text-sm font-black text-smash-gray uppercase tracking-widest">/mo</span>
    </div>
    <ul className="space-y-4 mb-10 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-3 text-smash-gray font-bold group-hover:text-white transition-colors">
          <Check size={18} className="text-smash-orange flex-shrink-0 mt-0.5" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all ${badge ? 'bg-smash-orange text-white' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white'}`}>
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
  const [activeTab, setActiveTab] = useState<'listeners' | 'artists'>('listeners');

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-smash-black text-white selection:bg-smash-orange/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-smash-black/10 backdrop-blur-xl border-b border-white/5">
        <Logo size="md" className="cursor-pointer group" onClick={() => navigate('/')} />
        <div className="flex items-center gap-4 md:gap-8">
          <button onClick={() => navigate('/auth')} className="hidden md:block text-xs font-black text-smash-gray hover:text-white uppercase tracking-widest transition-colors">Sign In</button>
          <button 
            onClick={() => navigate('/auth')} 
            className="px-8 py-3 bg-white text-smash-black rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all transform hover:-translate-y-1 shadow-xl shadow-white/5"
          >
            Join Free
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
              <Zap size={14} className="animate-pulse" />
              <span className="tracking-widest uppercase italic">Premium Streaming</span>
            </div>
            <h1 className="text-7xl md:text-[140px] font-black font-display leading-[0.8] tracking-tighter mb-10 italic uppercase">
              ELEVATE YOUR<br/><span className="text-smash-orange">MUSIC</span>
            </h1>
            <p className="text-2xl text-smash-gray max-w-xl mb-12 leading-relaxed font-semibold">
              Experience the evolution of streaming in Malawi. Delivering studio-quality sound, empowering local creators, and connecting you to the artists you love.
            </p>
            <div className="flex flex-wrap gap-5">
              <button 
                 onClick={() => navigate('/auth')}
                 className="px-12 py-6 bg-white text-smash-black rounded-[32px] font-black text-xl flex items-center gap-3 hover:bg-smash-orange hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:shadow-none"
              >
                START LISTENING <Headphones size={28} />
              </button>
              <button 
                 onClick={() => navigate('/auth')}
                 className="px-12 py-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] font-black text-xl flex items-center gap-3 hover:bg-white/10 transition-all border-b-4 border-b-white/5 active:border-b-0 active:translate-y-1"
              >
                ARTIST STUDIO <Mic2 size={28} />
              </button>
            </div>

            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                   <p className="text-3xl font-black font-display italic text-white mb-1">50K+</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Listeners</p>
                </div>
                <div>
                   <p className="text-3xl font-black font-display italic text-smash-orange mb-1">200+</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Artists</p>
                </div>
                <div>
                   <p className="text-3xl font-black font-display italic text-white mb-1">MK 5M+</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Paid Out</p>
                </div>
                <div>
                   <p className="text-3xl font-black font-display italic text-smash-green mb-1">90%</p>
                   <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Payout Rate</p>
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
                          <Flame className="text-white" size={28} />
                       </div>
                       <div>
                          <p className="text-xs uppercase font-black text-smash-gray tracking-[0.2em] mb-1">MOTO FEED</p>
                          <p className="font-display font-black text-2xl italic tracking-tight uppercase leading-none">Discover Daily</p>
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
            {/* Float Stats */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-10 z-20 glass-morphism p-6 rounded-3xl border border-white/10 shadow-2xl hidden md:block"
            >
               <TrendingUp className="text-smash-green mb-2" size={32} />
               <p className="text-4xl font-black font-display italic">+210%</p>
               <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Usage Growth</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-24">
              <h2 className="text-5xl md:text-8xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">HOW IT <span className="text-smash-orange">WORKS</span></h2>
              <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">Your three-step journey to musical freedom.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="relative p-12 bento-card bg-white/5 border-white/5 group hover:border-smash-orange/30 transition-all">
                 <div className="text-8xl font-black font-display text-white/5 absolute -top-4 left-4">01</div>
                 <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-smash-orange/10 flex items-center justify-center text-smash-orange mb-8 group-hover:scale-110 transition-transform">
                       <Users size={32} />
                    </div>
                    <h3 className="text-3xl font-black font-display italic uppercase mb-4">SIGN UP FREE</h3>
                    <p className="text-smash-gray text-lg font-medium leading-relaxed">Create your account in 30 seconds. Choose listener or artist mode to get started instantly.</p>
                 </div>
              </div>
              
              <div className="relative p-12 bento-card bg-white/5 border-white/5 group hover:border-smash-purple/30 transition-all">
                 <div className="text-8xl font-black font-display text-white/5 absolute -top-4 left-4">02</div>
                 <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-smash-purple/10 flex items-center justify-center text-smash-purple mb-8 group-hover:scale-110 transition-transform">
                       <Compass size={32} />
                    </div>
                    <h3 className="text-3xl font-black font-display italic uppercase mb-4">DISCOVER MUSIC</h3>
                    <p className="text-smash-gray text-lg font-medium leading-relaxed">Browse trending Malawian hits. From Afropop to Gospel, find the soundtrack to your life.</p>
                 </div>
              </div>

              <div className="relative p-12 bento-card bg-white/5 border-white/5 group hover:border-smash-green/30 transition-all">
                 <div className="text-8xl font-black font-display text-white/5 absolute -top-4 left-4">03</div>
                 <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-smash-green/10 flex items-center justify-center text-smash-green mb-8 group-hover:scale-110 transition-transform">
                       <Heart size={32} />
                    </div>
                    <h3 className="text-3xl font-black font-display italic uppercase mb-4">SUPPORT ARTISTS</h3>
                    <p className="text-smash-gray text-lg font-medium leading-relaxed">Buy songs, donate, or subscribe. Know that 90% of your money goes straight to the creator.</p>
                 </div>
              </div>
           </div>
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
                title="Free Plan" 
                price="0" 
                features={["Stream unlimited Malawian music", "Discover via Moto Feed", "Create up to 3 playlists", "30-second song previews"]} 
             />
             <PricingCard 
                title="Premium" 
                price="2,500" 
                badge="MOST POPULAR"
                features={["Everything in Free", "Ad-free listening", "Offline downloads", "HD audio quality", "Unlimited playlists"]} 
             />
             <PricingCard 
                title="Family" 
                price="4,500" 
                features={["Everything in Premium", "Up to 5 separate accounts", "Shared family queue", "Parental controls", "One billing for everyone"]} 
             />
          </div>

          {/* Why Smashify Wins Table */}
          <div className="hidden lg:block bento-card bg-white/5 border-white/5 overflow-hidden">
             <table className="w-full text-left">
                <thead>
                   <tr className="border-b border-white/10 uppercase tracking-[0.2em] font-black text-[10px] text-smash-gray">
                      <th className="p-8">Feature</th>
                      <th className="p-8 text-smash-orange">Smashify</th>
                      <th className="p-8">Spotify</th>
                      <th className="p-8">YouTube Music</th>
                   </tr>
                </thead>
                <tbody className="font-bold">
                   <tr className="border-b border-white/5">
                      <td className="p-8">MWK Pricing</td>
                      <td className="p-8 text-smash-green"><Check size={20} /></td>
                      <td className="p-8 text-smash-red">✗</td>
                      <td className="p-8 text-smash-red">✗</td>
                   </tr>
                   <tr className="border-b border-white/5">
                      <td className="p-8">Mobile Money (Airtel/TNM)</td>
                      <td className="p-8 text-smash-green"><Check size={20} /></td>
                      <td className="p-8 text-smash-red">✗</td>
                      <td className="p-8 text-smash-red">✗</td>
                   </tr>
                   <tr className="border-b border-white/5">
                      <td className="p-8">Artist Keeps 90%</td>
                      <td className="p-8 text-smash-green"><Check size={20} /></td>
                      <td className="p-8 text-smash-gray">~70%</td>
                      <td className="p-8 text-smash-gray">~70%</td>
                   </tr>
                   <tr className="border-b border-white/5">
                      <td className="p-8">Local Charts & Trends</td>
                      <td className="p-8 text-smash-green"><Check size={20} /></td>
                      <td className="p-8 text-smash-gray">Global-focused</td>
                      <td className="p-8 text-smash-gray">Global-focused</td>
                   </tr>
                   <tr>
                      <td className="p-8">Free Streaming</td>
                      <td className="p-8 text-smash-green">Unlimited</td>
                      <td className="p-8">30 Days Only</td>
                      <td className="p-8">Free (with ads)</td>
                   </tr>
                </tbody>
             </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 md:px-12 bg-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-24">
             <h2 className="text-5xl md:text-8xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">ANY <span className="text-smash-orange">QUESTIONS?</span></h2>
             <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">Everything you need to know about Smashify.</p>
          </div>

          <div className="space-y-4">
             <FAQItem 
               question="Is Smashify free to use?" 
               answer="Yes. Streaming is completely free. You can upgrade to Premium (MK 2,500/month) for ad-free listening, offline mode, and HD audio." 
             />
             <FAQItem 
               question="How do artists get paid?" 
               answer="Artists receive 90% of every song purchase and fan donation. Earnings are held in their Smashify wallet and can be withdrawn instantly to Airtel Money or TNM Mpamba. No bank account required." 
             />
             <FAQItem 
               question="What is the platform fee?" 
               answer="Smashify charges 10% on purchases and donations. Withdrawal fee is 3% (PayChangu processing). There are no hidden fees." 
             />
             <FAQItem 
               question="Can I cancel my subscription?" 
               answer="Yes, anytime. Your plan stays active until the end of the billing period. No refunds for partial months." 
             />
             <FAQItem 
               question="How do I become a verified artist?" 
               answer="Sign up as an artist, upload your ID/passport, and our team will review your application within 48 hours. Verified artists get a blue badge and featured placement." 
             />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-6 md:px-12 text-center bg-smash-orange border-y-8 border-smash-black relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
         <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-7xl md:text-[160px] font-black font-display italic uppercase tracking-tighter text-black leading-none mb-12">READY TO<br/>SMASH IT?</h2>
            <button 
              onClick={() => navigate('/auth')}
              className="px-20 py-10 bg-black text-white rounded-[40px] font-black text-3xl uppercase italic tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
               Get Started Now
            </button>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-6 md:px-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 mb-32">
          <div className="space-y-8">
            <Logo size="lg" />
            <p className="text-smash-gray text-lg max-w-sm font-medium leading-relaxed">The soundtrack to your life, built for the Warm Heart of Africa. Optimised for local needs.</p>
            <div className="flex gap-4">
               {['ig', 'tw', 'fb', 'tk', 'yt'].map(s => (
                 <div key={s} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-smash-gray hover:text-smash-orange transition-all cursor-pointer uppercase font-black text-[10px]">
                   {s}
                 </div>
               ))}
            </div>
          </div>
          
          <div className="space-y-8">
             <h4 className="text-xl font-black font-display uppercase italic tracking-[0.2em]">About</h4>
             <ul className="space-y-4 text-smash-gray font-bold">
                <li onClick={() => navigate('/about')} className="hover:text-smash-orange cursor-pointer transition-colors">Our Story</li>
                <li onClick={() => navigate('/about')} className="hover:text-smash-orange cursor-pointer transition-colors">The Numbers</li>
                <li onClick={() => navigate('/contact')} className="hover:text-smash-orange cursor-pointer transition-colors">Contact Us</li>
                <li className="hover:text-smash-orange cursor-pointer transition-colors" key="airtel">Airtel Partnership</li>
             </ul>
          </div>

          <div className="space-y-8">
             <h4 className="text-xl font-black font-display uppercase italic tracking-[0.2em]">For Users</h4>
             <ul className="space-y-4 text-smash-gray font-bold">
                <li onClick={() => navigate('/pricing')} className="hover:text-smash-orange cursor-pointer transition-colors">Pricing Plans</li>
                <li className="hover:text-smash-orange cursor-pointer transition-colors">Moto Discovery</li>
                <li className="hover:text-smash-orange cursor-pointer transition-colors">Help Center</li>
                <li className="hover:text-smash-orange cursor-pointer transition-colors">Cookie Policy</li>
             </ul>
          </div>

          <div className="space-y-8">
             <h4 className="text-xl font-black font-display uppercase italic tracking-[0.2em]">For Artists</h4>
             <ul className="space-y-4 text-smash-gray font-bold">
                <li onClick={() => navigate('/artist-hub')} className="hover:text-smash-orange cursor-pointer transition-colors">Artist Portal</li>
                <li onClick={() => navigate('/pricing?tab=artists')} className="hover:text-smash-orange cursor-pointer transition-colors">Artist Pricing</li>
                <li className="hover:text-smash-orange cursor-pointer transition-colors">Verification Process</li>
                <li className="hover:text-smash-orange cursor-pointer transition-colors">Payment Support</li>
             </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest leading-none">© 2026 Smashify Ltd. Registered in Malawi. All rights reserved.</p>
              <p className="text-[10px] font-black text-smash-gray/50 uppercase tracking-widest leading-none flex items-center justify-center md:justify-start gap-2">
                 <ShieldCheck size={12} /> Payments powered by PayChangu | Mobile Money: Airtel + TNM
              </p>
           </div>
           <div className="flex gap-8 text-[10px] font-black text-smash-gray uppercase tracking-[0.3em]">
              <span onClick={() => navigate('/terms')} className="hover:text-white cursor-pointer">Terms</span>
              <span onClick={() => navigate('/privacy')} className="hover:text-white cursor-pointer">Privacy</span>
              <span>Credits</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
