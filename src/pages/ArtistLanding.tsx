import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Mic2, Rocket, Star, ShieldCheck, 
  CheckCircle2, TrendingUp, Music, LayoutDashboard,
  Smartphone, Wallet, ChevronRight, Play, Heart, Star as StarIcon
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { supabase } from '../lib/supabase';

const Nav = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center justify-between px-6 md:px-12 transition-all duration-200 border-b ${isScrolled ? 'bg-[#0A0A0D]/92 backdrop-blur-xl border-white/5' : 'bg-transparent border-transparent'}`}>
      <div className="flex items-center gap-8">
        <Logo size="md" />
        <div className="hidden lg:flex items-center gap-8">
          <Link to="/" className="font-display font-medium text-[13px] text-white/50 hover:text-white transition-colors uppercase tracking-widest">Listener App</Link>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span className="font-display font-bold text-[13px] text-smash-purple uppercase tracking-widest">Artist Studio</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/auth/artist')} className="px-6 h-[40px] font-display font-bold text-[12px] text-white/60 hover:text-white uppercase tracking-widest transition-all">Sign In</button>
        <button 
          onClick={() => navigate('/auth/artist?mode=signup')} 
          className="h-[40px] px-6 bg-white text-black font-display font-bold text-[12px] uppercase tracking-widest rounded-full hover:bg-smash-purple hover:text-white transition-all transform hover:-translate-y-0.5 active:scale-95"
        >
          Join Studio
        </button>
      </div>
    </nav>
  );
};

const ArtistLanding: React.FC = () => {
  const navigate = useNavigate();
  const [topEarners, setTopEarners] = useState<any[]>([]);

  useEffect(() => {
    const fetchEarners = async () => {
       const { data } = await supabase.from('profiles').select('id, stage_name, full_name, avatar_url, genre').eq('approved', true).limit(5);
       setTopEarners(data || []);
    };
    fetchEarners();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-white selection:bg-smash-purple/30 overflow-x-hidden pt-[72px]">
      <Nav />

      {/* Hero Section - Split Photo Layout */}
      <section className="relative min-h-[85vh] flex items-center px-6 md:px-12 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24 w-full">
          <div className="flex-1 relative z-10 text-center lg:text-left">
             <motion.div
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-smash-purple/10 border border-smash-purple/20 text-smash-purple font-display font-bold text-[10px] uppercase tracking-[0.2em] mb-8"
             >
               🚀 Artist Distribution Now Open
             </motion.div>

             <motion.h1
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="text-[clamp(2.5rem,5vw,5rem)] font-display font-semibold leading-[1.05] tracking-tight text-white mb-8"
             >
               Monetize your <span className="italic">African</span> fans <br/>
               <span className="text-smash-purple">Keep up to 95% of your earnings.</span>
             </motion.h1>

             <motion.p
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.3 }}
               className="text-[18px] md:text-[20px] font-sans text-white/50 max-w-xl leading-relaxed mb-12 mx-auto lg:mx-0 font-medium"
             >
               Smashify Studio is the direct platform that lets you distribute music, sell individual songs, and receive fan donations directly via Mobile Money.
             </motion.p>

             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.4 }}
               className="flex flex-wrap items-center justify-center lg:justify-start gap-5 mb-16"
             >
                <button 
                  onClick={() => navigate('/auth/artist?mode=signup')}
                  className="h-[56px] px-10 bg-smash-purple text-white rounded-[12px] font-display font-bold text-[14px] uppercase tracking-widest hover:brightness-110 transform hover:-translate-y-1 transition-all shadow-2xl shadow-smash-purple/20"
                >
                   Get Started for Free
                </button>
                <button className="h-[56px] px-10 bg-transparent border-2 border-white/10 text-white rounded-[12px] font-display font-bold text-[14px] uppercase tracking-widest hover:border-smash-purple/50 transition-all">
                   View Pricing
                </button>
             </motion.div>

             <div className="flex flex-wrap items-center justify-center lg:justify-start gap-10 border-t border-white/5 pt-12">
                {[
                  { label: 'Artist Share', val: '90%' },
                  { label: 'Min. Withdrawal', val: 'MK 500' },
                  { label: 'Settlement', val: 'Instant' }
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center lg:items-start">
                     <span className="text-[24px] font-studio font-bold text-white mb-1">{stat.val}</span>
                     <span className="text-[10px] font-display text-white/40 uppercase tracking-widest">{stat.label}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="flex-1 w-full max-w-2xl relative">
             <div className="aspect-[4/5] rounded-[24px] overflow-hidden group shadow-2xl border border-white/5">
                <img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1000" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
             </div>

             {/* Featured Artist Overlay */}
             <motion.div 
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.8, delay: 0.5 }}
               className="absolute -right-6 top-1/2 -translate-y-1/2 w-[280px] bg-[#141418]/90 backdrop-blur-xl border border-white/10 rounded-[20px] p-5 shadow-2xl hidden md:block"
             >
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 rounded-full border-2 border-smash-purple p-0.5">
                      <img src="https://placehold.co/100" className="w-full h-full rounded-full object-cover" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-smash-purple uppercase tracking-widest mb-0.5">Featured Artist</p>
                      <p className="text-[16px] font-display font-bold text-white truncate">Top African Star</p>
                   </div>
                </div>
                <div className="p-4 bg-white/5 rounded-[12px] border border-white/5 space-y-3">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 uppercase font-black uppercase tracking-widest">Earnings</span>
                      <span className="text-[13px] font-studio font-bold text-smash-green">+MK 125,000</span>
                   </div>
                   <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="w-[75%] h-full bg-smash-green" />
                   </div>
                   <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Streaming Revenue - Sep 2024</p>
                </div>
             </motion.div>
          </div>
        </div>
      </section>

      {/* Top Earners Row */}
      <section className="py-20 px-6 md:px-12 bg-white/[0.02]">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
            <div>
               <p className="text-[10px] font-display font-black text-white/40 uppercase tracking-[0.4em] mb-4">Studio Leaders</p>
               <h2 className="text-3xl font-studio font-black italic uppercase tracking-tighter">Earnings <span className="text-smash-purple underline underline-offset-8">Report</span></h2>
            </div>
            <div className="flex -space-x-4">
               {topEarners.map((earner, i) => (
                 <div key={earner.id} className="w-14 h-14 rounded-full border-4 border-[#141418] bg-bg-elevated overflow-hidden hover:z-10 hover:-translate-y-2 transition-all cursor-pointer">
                    <img src={earner.avatar_url || "https://placehold.co/100"} className="w-full h-full object-cover" alt="" title={earner.stage_name} />
                 </div>
               ))}
               <div className="w-14 h-14 rounded-full border-4 border-[#141418] bg-bg-elevated flex items-center justify-center text-[12px] font-black italic uppercase tracking-widest text-text-muted">
                  +100
               </div>
            </div>
            <div className="md:text-right">
               <p className="text-[24px] font-studio font-bold text-white">MK 25M+</p>
               <p className="text-[10px] font-display text-white/40 uppercase tracking-widest">Total Payouts to African Artists</p>
            </div>
         </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-20 items-center mb-32">
             <div>
                <h2 className="text-4xl md:text-6xl font-studio font-black italic uppercase leading-tight mb-8">Built for the <span className="text-smash-purple">African</span> landscape.</h2>
                <div className="space-y-6">
                   {[
                     { title: 'Airtel Money & Mpamba', desc: 'No bank account? No problem. Withdraw your earnings directly to your mobile wallet instantly.' },
                     { title: 'Fair Share Model', desc: 'You keep up to 95% of every sale, every donation, and every stream. We only take a small cut to keep things running.' },
                     { title: 'Direct MP3 Sales', desc: 'Allow your fans to buy your songs as high-quality downloads. Set your own price per track.' }
                   ].map((f, i) => (
                     <div key={i} className="flex gap-5">
                        <div className="w-6 h-6 rounded-full bg-smash-purple/20 flex items-center justify-center shrink-0 mt-1">
                           <CheckCircle2 size={14} className="text-smash-purple" />
                        </div>
                        <div>
                           <h4 className="text-[16px] font-display font-bold uppercase italic text-white mb-1">{f.title}</h4>
                           <p className="text-[14px] text-white/50 leading-relaxed font-sans">{f.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: LayoutDashboard, title: 'Deep Analytics', val: 'Listeners, Plays, Heatmaps', color: 'text-smash-purple' },
                  { icon: TrendingUp, title: 'Trending Charts', val: 'Rise to the top 10', color: 'text-smash-orange' },
                  { icon: StarIcon, title: 'Fan Benefits', val: 'Supporter badges & Perks', color: 'text-smash-cyan' },
                  { icon: Smartphone, title: 'Smart Distribution', val: 'Viral feed integration', color: 'text-smash-green' }
                ].map((c, i) => (
                  <div key={i} className="bg-bg-surface border border-border-subtle rounded-[24px] p-8 hover:border-smash-purple/30 transition-all group">
                     <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-8 ${c.color}`}>
                        <c.icon size={24} />
                     </div>
                     <h3 className="text-xl font-studio font-bold uppercase italic text-white mb-2">{c.title}</h3>
                     <p className="text-[13px] text-white/50 font-display font-medium uppercase tracking-widest">{c.val}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-32 px-6 md:px-12 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
           <div className="text-center mb-24">
              <h2 className="text-[10px] font-display font-bold text-smash-purple uppercase tracking-[0.4em] mb-4">Journey to Success</h2>
              <h3 className="text-5xl md:text-7xl font-studio font-black italic uppercase leading-tight">Three steps to <span className="text-smash-purple">monetising</span> your art.</h3>
           </div>
           
           <div className="space-y-20 relative before:absolute before:left-10 md:before:left-1/2 before:top-0 before:bottom-0 before:w-px before:bg-white/10">
              {[
                { step: '01', title: 'Join Studio', desc: 'Create your artist account and complete your profile. We review every artist to ensure quality for our listeners.' },
                { step: '02', title: 'Upload & Distribute', desc: 'Upload your high-quality tracks or albums. Set your price, add lyrics, and choose your release date.' },
                { step: '03', title: 'Get Paid', desc: 'Fans stream, buy, and donate. Withdraw your accumulated earnings daily to your mobile money account.' }
              ].map((s, i) => (
                <div key={i} className={`flex flex-col md:flex-row items-center gap-12 relative z-10 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                   <div className="flex-1 md:text-right">
                      <div className={`flex flex-col ${i % 2 === 1 ? 'md:items-start' : 'md:items-end'}`}>
                         <h4 className="text-[clamp(1.5rem,3vw,2rem)] font-studio font-bold uppercase italic text-white mb-4">{s.title}</h4>
                         <p className="text-[15px] text-white/50 leading-relaxed font-sans max-w-sm">{s.desc}</p>
                      </div>
                   </div>
                   <div className="w-20 h-20 rounded-full bg-smash-purple text-white font-studio font-black text-2xl flex items-center justify-center shrink-0 border-[8px] border-[#0A0A0D]">
                      {s.step}
                   </div>
                   <div className="flex-1" />
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
             <h3 className="text-5xl md:text-8xl font-studio font-black italic uppercase tracking-tighter leading-none mb-4">STUDIO <span className="text-smash-purple">ACCESS</span></h3>
             <p className="text-white/50 text-xl font-medium tracking-tight">Simple 6-month plans with zero hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
             <div className="bg-bg-surface border border-border-subtle rounded-[24px] p-10 flex flex-col group hover:border-smash-purple/30 transition-all">
                <h3 className="text-2xl font-studio font-bold uppercase italic mb-2">Rising Star</h3>
                <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-4xl font-studio font-bold text-white">8,000</span>
                   <span className="text-[11px] font-display font-medium text-white/40 uppercase tracking-widest">MWK / 6 MO</span>
                </div>
                <ul className="space-y-4 flex-1">
                   {["Upload 12 songs/yr", "Mobile analytics", "Standard payouts", "Supporter badges"].map((f, i) => (
                     <li key={i} className="flex items-center gap-3 text-[14px] text-white/60 font-medium font-sans">
                        <CheckCircle2 size={16} className="text-smash-purple shrink-0" />
                        {f}
                     </li>
                   ))}
                </ul>
                <p className="text-center text-xs text-white/50 mt-6 mb-4">Or MK 14,000 per year — save 12%</p>
                <button 
                   onClick={() => navigate('/auth/artist?mode=signup')}
                   className="w-full h-[54px] bg-white text-black rounded-[14px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-smash-purple hover:text-white transition-all shadow-xl mt-auto"
                >
                   GET STARTED
                </button>
             </div>

             <div className="bg-bg-surface border-2 border-smash-purple rounded-[24px] p-10 flex flex-col relative overflow-hidden transform scale-105 z-10 shadow-3xl shadow-smash-purple/20">
                <div className="absolute top-6 right-0 bg-smash-purple text-white text-[10px] font-black px-4 py-1.5 rounded-l-full uppercase tracking-widest">MOST POPULAR</div>
                <h3 className="text-2xl font-studio font-bold uppercase italic mb-2 text-smash-purple">Standard</h3>
                <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-4xl font-studio font-bold text-white">13,000</span>
                   <span className="text-[11px] font-display font-medium text-white/40 uppercase tracking-widest">MWK / 6 MO</span>
                </div>
                <ul className="space-y-4 flex-1">
                   {["UNLIMITED uploads", "Full dashboard", "Priority payouts", "Verified profile", "Advanced promotion"].map((f, i) => (
                     <li key={i} className="flex items-center gap-3 text-[14px] text-white font-medium font-sans">
                        <CheckCircle2 size={16} className="text-smash-purple shrink-0" />
                        {f}
                     </li>
                   ))}
                </ul>
                <p className="text-center text-xs text-white/50 mt-6 mb-4">Or MK 23,000 per year — save 12%</p>
                <button 
                   onClick={() => navigate('/auth/artist?mode=signup')}
                   className="w-full h-[54px] bg-smash-purple text-white rounded-[14px] font-display font-bold text-[12px] uppercase tracking-widest hover:brightness-110 shadow-xl mt-auto"
                >
                   JOIN STANDARD
                </button>
             </div>

             <div className="bg-bg-surface border border-border-subtle rounded-[24px] p-10 flex flex-col group hover:border-smash-purple/30 transition-all">
                <h3 className="text-2xl font-studio font-bold uppercase italic mb-2">Elite / Label</h3>
                <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-4xl font-studio font-bold text-white">24,000</span>
                   <span className="text-[11px] font-display font-medium text-white/40 uppercase tracking-widest">MWK / 6 MO</span>
                </div>
                <ul className="space-y-4 flex-1">
                   {["Manage 5 artists", "Shared dashboards", "Dedicated manager", "Revenue splitting", "Custom contracts"].map((f, i) => (
                     <li key={i} className="flex items-center gap-3 text-[14px] text-white/60 font-medium font-sans">
                        <CheckCircle2 size={16} className="text-smash-purple shrink-0" />
                        {f}
                     </li>
                   ))}
                </ul>
                <p className="text-center text-xs text-white/50 mt-6 mb-4">Or MK 42,000 per year — save 12%</p>
                <button 
                   onClick={() => navigate('/auth/artist?mode=signup')}
                   className="w-full h-[54px] bg-white text-black rounded-[14px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-smash-purple hover:text-white transition-all shadow-xl mt-auto"
                >
                   CONTACT SALES
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 md:px-12 bg-smash-purple overflow-hidden relative">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/music.png')]" />
         <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl md:text-8xl font-studio font-black italic uppercase leading-none text-white mb-8">Ready to <span className="text-black">smash</span> the charts?</h2>
            <p className="text-white/80 text-xl font-medium mb-12 max-w-2xl mx-auto">Join the movement and start distributing your music today. The industry is changing, don't get left behind.</p>
            <button 
               onClick={() => navigate('/auth/artist?mode=signup')}
               className="h-[64px] px-12 bg-white text-smash-purple font-display font-bold text-lg uppercase tracking-widest rounded-[16px] transform hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
               Create Artist Account
            </button>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 md:px-12 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
           <Logo size="md" />
           <p className="text-[14px] text-white/30 font-medium order-last md:order-none">© {new Date().getFullYear()} Smashify Studio. All rights reserved.</p>
           <div className="flex gap-10">
              {['About', 'Help', 'Terms', 'Privacy'].map(l => (
                <Link key={l} to={`/${l.toLowerCase()}`} className="text-[12px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors">{l}</Link>
              ))}
           </div>
        </div>
      </footer>
    </div>
  );
};

export default ArtistLanding;
