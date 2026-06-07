import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Mic2, Rocket, Star, ShieldCheck, 
  CircleCheck, TrendingUp, Music, LayoutDashboard,
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
  const [platformStats, setPlatformStats] = useState({
    artists: 0,
    totalPaid: 0,
    songs: 0
  });

  useEffect(() => {
    const fetchEarners = async () => {
       const { data } = await supabase.from('profiles').select('id, stage_name, full_name, avatar_url, genre').eq('approved', true).limit(5);
       setTopEarners(data || []);

       const [
        { count: artistCount },
        { count: songCount },
        { data: payoutData }
       ] = await Promise.all([
        supabase.from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('approved', true),
        supabase.from('songs')
          .select('*', { count: 'exact', head: true })
          .eq('approved', true),
        supabase.from('payout_requests')
          .select('amount')
          .eq('status', 'paid')
       ]);
       
       const totalPaid = (payoutData || [])
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        
       setPlatformStats({
        artists: artistCount || 0,
        totalPaid,
        songs: songCount || 0
       });
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
               Sell your music. Accept tips. Get paid today. Smashify gives your fans a direct way to support you — via Airtel Money and TNM Mpamba. No middleman. No waiting for stream counts.
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
                <button 
                  onClick={() => {
                    document.getElementById('pricing-section')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="h-[56px] px-10 bg-transparent border-2 border-white/10 text-white rounded-[12px] font-display font-bold text-[14px] uppercase tracking-widest hover:border-smash-purple/50 transition-all"
                >
                   View Pricing
                </button>
             </motion.div>

             <div className="flex flex-wrap items-center justify-center lg:justify-start gap-10 border-t border-white/5 pt-12">
                {[
                  { label: 'Artist Keep', val: 'Up to 95%' },
                  { label: 'Min. Withdrawal', val: 'MK 2,000' },
                  { label: 'Paid Via', val: 'Airtel / TNM' }
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
                   <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-2">This Month's Earnings</span>
                   
                   <div className="flex justify-between items-center text-[13px] font-sans">
                     <span className="text-white/60">💰 Track Sales</span>
                     <span className="text-white font-medium">+MK 45,000</span>
                   </div>
                   <div className="flex justify-between items-center text-[13px] font-sans">
                     <span className="text-white/60">💸 Tips Received</span>
                     <span className="text-white font-medium">+MK 18,500</span>
                   </div>
                   <div className="flex justify-between items-center text-[13px] font-sans">
                     <span className="text-white/60">❤️ Fan Subs</span>
                     <span className="text-white font-medium">+MK 12,000</span>
                   </div>
                   
                   <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                     <span className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Total</span>
                     <span className="text-[16px] font-studio font-bold text-smash-green">MK 75,500</span>
                   </div>

                   <p className="text-[9px] text-center text-white/30 uppercase font-bold tracking-widest mt-2">Direct fan payments — no streams needed</p>
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
               {topEarners.length > 0 ? (
                 topEarners.map((earner, i) => (
                   <div key={earner.id} className="w-14 h-14 rounded-full border-4 border-[#141418] bg-bg-elevated overflow-hidden hover:z-10 hover:-translate-y-2 transition-all cursor-pointer">
                      <img src={earner.avatar_url || "https://placehold.co/100"} className="w-full h-full object-cover" alt="" title={earner.stage_name} />
                   </div>
                 ))
               ) : (
                 <div className="w-14 h-14 rounded-full border-4 border-[#141418] bg-bg-elevated" />
               )}
               <div className="w-14 h-14 rounded-full border-4 border-[#141418] bg-bg-elevated flex items-center justify-center text-[12px] font-black italic uppercase tracking-widest text-text-muted">
                  +{platformStats.artists > 5 ? platformStats.artists - 5 : 0}
               </div>
            </div>
            <div className="md:text-right">
               <p className="text-[24px] font-studio font-bold text-white">
                 {platformStats.totalPaid > 0
                   ? `MK ${(platformStats.totalPaid/1000).toFixed(0)}K+`
                   : 'Growing Daily'}
               </p>
               <p className="text-[10px] font-display text-white/40 uppercase tracking-widest">Total Paid to Artists</p>
            </div>
         </div>
      </section>

      {/* How Artists Earn Section */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-[10px] font-display font-black text-smash-purple uppercase tracking-[0.4em] mb-4">
              Your Money Your Way
            </p>
            <h2 className="text-4xl md:text-6xl font-studio font-black italic uppercase leading-tight">
              4 ways to earn on <span className="text-smash-purple">Smashify</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
            {[
              {
                emoji: '💿',
                title: 'Sell Your Tracks',
                desc: 'Set your own price per song. Fans pay to download or unlock. You keep up to 95% of every sale.',
                example: 'MK 500/track × 100 fans = MK 50,000',
                color: 'border-smash-orange/30 hover:border-smash-orange/60',
                tag: 'Rising Star+',
              },
              {
                emoji: '💸',
                title: 'Accept Tips',
                desc: 'Fans can tip you directly from your profile page or while watching your MotoFeed. Any amount, any time.',
                example: 'MK 1,000 tip × 50 fans = MK 50,000',
                color: 'border-smash-cyan/30 hover:border-smash-cyan/60',
                tag: 'All Tiers',
              },
              {
                emoji: '❤️',
                title: 'Fan Subscriptions',
                desc: 'Fans pay a monthly amount to support you and access exclusive content. Predictable monthly income.',
                example: 'MK 500/mo × 200 fans = MK 100,000/mo',
                color: 'border-smash-purple/30 hover:border-smash-purple/60',
                tag: 'Rising Star+',
              },
              {
                emoji: '🔒',
                title: 'Exclusive Content',
                desc: 'Lock your best tracks, remixes, or early releases behind a one-time payment. Fans pay once, access forever.',
                example: 'MK 1,000 × 80 fans = MK 80,000',
                color: 'border-smash-green/30 hover:border-smash-green/60',
                tag: 'Rising Star+',
              }
            ].map((item, i) => (
              <div key={i} className={`p-8 bg-white/[0.02] rounded-[24px] border ${item.color} transition-all group`}>
                <div className="flex items-start justify-between mb-6">
                  <span className="text-4xl">{item.emoji}</span>
                  <span className="text-[10px] font-black px-3 py-1 bg-white/5 rounded-full text-white/40 uppercase tracking-widest">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-xl font-studio font-bold uppercase italic text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-[14px] text-white/50 leading-relaxed font-sans mb-6">
                  {item.desc}
                </p>
                <div className="p-3 bg-smash-green/5 rounded-xl border border-smash-green/10">
                  <p className="text-[11px] text-smash-green font-bold">
                    📊 {item.example}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison vs Spotify */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-center text-2xl font-studio font-black italic uppercase mb-8">
              Why <span className="text-smash-purple">Smashify</span> beats waiting for streams
            </h3>
            <div className="overflow-x-auto rounded-[20px] border border-white/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left p-4 text-xs text-white/40 font-display uppercase tracking-widest"></th>
                    <th className="p-4 text-center text-xs text-white/40 font-display uppercase tracking-widest">Spotify</th>
                    <th className="p-4 text-center text-xs text-smash-purple font-black font-display uppercase tracking-widest">Smashify</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Earn MK 50,000', 'Need ~1.5M streams', '100 fans × MK 500 sale'],
                    ['Get paid', '3-6 months delay', 'Same day to wallet'],
                    ['Payment method', 'Bank transfer (USD)', 'Airtel Money / TNM'],
                    ['Artist keeps', '~18-25%', 'Up to 95%'],
                    ['Available in Malawi', '❌ Limited', '✅ 100% local'],
                  ].map(([feature, spotify, smashify], i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0 bg-white/[0.01]">
                      <td className="p-4 text-sm text-white/60 font-medium">{feature}</td>
                      <td className="p-4 text-center text-xs text-white/30">{spotify}</td>
                      <td className="p-4 text-center">
                        <span className="text-xs text-smash-green font-bold">{smashify}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                { step: '03', title: 'Get Paid', desc: 'Fans buy your music, send tips, and subscribe monthly. Your earnings go straight to your Smashify wallet. Withdraw to Airtel Money or TNM anytime — minimum MK 2,000.' }
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
      <section id="pricing-section" className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
             <h3 className="text-5xl md:text-8xl font-studio font-black italic uppercase tracking-tighter leading-none mb-4">STUDIO <span className="text-smash-purple">ACCESS</span></h3>
             <p className="text-white/50 text-xl font-medium tracking-tight">Simple 6-month plans with zero hidden fees.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
             <div className="bg-bg-surface border border-white/10 rounded-[24px] p-10 flex flex-col">
                <h3 className="text-2xl font-studio font-bold uppercase italic mb-2 text-white/60">Free Studio</h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-4xl font-studio font-bold text-white">0</span>
                  <span className="text-[11px] font-display font-medium text-white/40 uppercase tracking-widest">
                    MWK / Forever
                  </span>
                </div>
                <ul className="space-y-4 flex-1">
                  {[
                    "5 uploads (lifetime)",
                    "Free streaming only",
                    "15% fee on tips",
                    "Basic analytics",
                    "MK 50,000 max withdrawal",
                    "Must be verified to withdraw"
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-[14px] text-white/40 font-medium font-sans">
                      <CircleCheck size={16} className="text-white/20 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/auth/artist?mode=signup')}
                  className="w-full h-[54px] bg-white/5 border border-white/10 text-white/60 rounded-[14px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-white/10 transition-all mt-8"
                >
                  START FREE
                </button>
             </div>

             <div className="bg-bg-surface border border-border-subtle rounded-[24px] p-10 flex flex-col group hover:border-smash-purple/30 transition-all">
                <h3 className="text-2xl font-studio font-bold uppercase italic mb-2">Rising Star</h3>
                <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-4xl font-studio font-bold text-white">8,000</span>
                   <span className="text-[11px] font-display font-medium text-white/40 uppercase tracking-widest">MWK / 6 MO</span>
                </div>
                <ul className="space-y-4 flex-1">
                   {[
                     "10 uploads per 6 months",
                     "Sell tracks to fans",
                     "Accept fan subscriptions",
                     "10% fee on tips & sales",
                     "Standard analytics",
                     "MK 200,000 max withdrawal",
                     "3 day payout speed"
                   ].map((f, i) => (
                     <li key={i} className="flex items-center gap-3 text-[14px] text-white/60 font-medium font-sans">
                        <CircleCheck size={16} className="text-smash-purple shrink-0" />
                        {f}
                     </li>
                   ))}
                </ul>
                <button 
                   onClick={() => navigate('/auth/artist?mode=signup')}
                   className="w-full h-[54px] bg-white text-black rounded-[14px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-smash-purple hover:text-white transition-all shadow-xl mt-auto md:mt-8"
                >
                   GET RISING STAR
                </button>
             </div>

             <div className="bg-bg-surface border-2 border-smash-purple rounded-[24px] p-10 flex flex-col relative overflow-hidden transform scale-105 z-10 shadow-3xl shadow-smash-purple/20">
                <div className="absolute top-6 right-0 bg-smash-purple text-white text-[10px] font-black px-4 py-1.5 rounded-l-full uppercase tracking-widest">MOST POPULAR</div>
                <h3 className="text-2xl font-studio font-bold uppercase italic mb-2 text-smash-purple">Standard</h3>
                <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-4xl font-studio font-bold text-white">16,000</span>
                   <span className="text-[11px] font-display font-medium text-white/40 uppercase tracking-widest">MWK / 6 MO</span>
                </div>
                <ul className="space-y-4 flex-1">
                   {[
                     "15 uploads per 6 months",
                     "Sell tracks + fan subscriptions",
                     "7% fee on tips & sales",
                     "1 free featured placement/month",
                     "Advanced analytics",
                     "Verified badge on profile",
                     "MK 500,000 max withdrawal",
                     "24 hour payout speed"
                   ].map((f, i) => (
                     <li key={i} className="flex items-center gap-3 text-[14px] text-white font-medium font-sans">
                        <CircleCheck size={16} className="text-smash-purple shrink-0" />
                        {f}
                     </li>
                   ))}
                </ul>
                <button 
                   onClick={() => navigate('/auth/artist?mode=signup')}
                   className="w-full h-[54px] bg-smash-purple text-white rounded-[14px] font-display font-bold text-[12px] uppercase tracking-widest hover:brightness-110 shadow-xl mt-auto md:mt-8"
                >
                   JOIN STANDARD
                </button>
             </div>

             <div className="bg-bg-surface border border-border-subtle rounded-[24px] p-10 flex flex-col group hover:border-smash-purple/30 transition-all">
                <h3 className="text-2xl font-studio font-bold uppercase italic mb-2">Elite</h3>
                <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-4xl font-studio font-bold text-white">27,000</span>
                   <span className="text-[11px] font-display font-medium text-white/40 uppercase tracking-widest">MWK / 6 MO</span>
                </div>
                <ul className="space-y-4 flex-1">
                   {[
                     "25 uploads per 6 months",
                     "All Standard features included",
                     "5% fee on tips & sales",
                     "3 free featured placements/month",
                     "Full analytics with CSV export",
                     "Gold verified badge",
                     "Instant payouts",
                     "Unlimited withdrawals"
                   ].map((f, i) => (
                     <li key={i} className="flex items-center gap-3 text-[14px] text-white/60 font-medium font-sans">
                        <CircleCheck size={16} className="text-smash-purple shrink-0" />
                        {f}
                     </li>
                   ))}
                </ul>
                <button 
                   onClick={() => navigate('/auth/artist?mode=signup')}
                   className="w-full h-[54px] bg-white text-black rounded-[14px] font-display font-bold text-[12px] uppercase tracking-widest hover:bg-smash-purple hover:text-white transition-all shadow-xl mt-auto md:mt-8"
                >
                   JOIN ELITE
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* Agent Section */}
      <section className="py-24 px-6 md:px-12 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-smash-green/10 border border-smash-green/20 rounded-full mb-6">
            <span className="text-smash-green text-xs font-black uppercase tracking-widest">
              💼 Earn With Smashify
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-studio font-black uppercase italic mb-4">
            Become a <span className="text-smash-green">Smashify Agent</span>
          </h2>
          <p className="text-white/50 text-base mb-10 max-w-2xl mx-auto">
            Know artists? Refer them and earn 5% of their first subscription. Artists succeed, you get paid — directly to your mobile money.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              { e: '🤝', t: 'Refer an Artist', 
                d: 'Share your agent code with musicians who need to monetize their music' },
              { e: '💰', t: 'They Subscribe', 
                d: 'When they pay Rising Star, Standard or Elite — you earn 5%' },
              { e: '📱', t: 'You Get Paid', 
                d: 'Commission sent straight to your Airtel Money or TNM Mpamba' }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10 text-left">
                <div className="text-3xl mb-4">{item.e}</div>
                <h3 className="font-bold text-sm mb-2">
                  {item.t}
                </h3>
                <p className="text-white/40 text-xs leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
          <div className="p-5 bg-smash-green/10 border border-smash-green/20 rounded-2xl inline-block mb-8">
            <p className="text-smash-green font-bold text-sm">
              Refer 10 artists on Rising Star = 
              <span className="text-xl font-black ml-2">
                MK 4,000 commission
              </span>
            </p>
          </div>
          <br />
          <a
            href="https://wa.me/265883728868?text=I%20want%20to%20become%20a%20Smashify%20Agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 h-14 px-10 bg-smash-green text-white rounded-full font-display font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all"
          >
            Apply via WhatsApp →
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 md:px-12 bg-smash-purple overflow-hidden relative">
         <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/music.png')]" />
         <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl md:text-8xl font-studio font-black italic uppercase leading-none text-white mb-8">Ready to <span className="text-black">smash</span> the charts?</h2>
            <p className="text-white/80 text-xl font-medium mb-12 max-w-2xl mx-auto">
              Your fans are ready to pay you. Smashify gives them a direct way to do it — via Airtel Money and TNM. No streams needed. No middlemen. Start earning this week.
            </p>
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
           <div className="text-center md:text-left order-last md:order-none">
              <p className="text-[14px] text-white/30 font-medium mb-2">© {new Date().getFullYear()} Smashify Studio. All rights reserved.</p>
              <p className="text-[12px] text-white/20 font-medium">Contact: <a href="mailto:smashfymusic@gmail.com" className="hover:text-white/40">smashfymusic@gmail.com</a> | +265 88 372 88 68</p>
           </div>
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
