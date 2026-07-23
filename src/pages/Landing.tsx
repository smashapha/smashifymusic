import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic2, Headphones, TrendingUp, 
  Check, ChevronDown, ChevronUp, Compass, Heart,
  ShieldCheck, Infinity, Download, LayoutDashboard,
  Smartphone, User, Info, Star, Play, MapPin, Wallet, PieChart
} from 'lucide-react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { optimizeImage } from '../lib/imageUtils';
import SEO from '../components/common/SEO';
import Footer from '../components/common/Footer';

const Nav = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center justify-between px-6 md:px-12 transition-all duration-200 border-b ${isScrolled || mobileMenuOpen ? 'bg-[#0A0A0D]/92 backdrop-blur-xl border-white/5' : 'bg-transparent border-transparent'}`}>
        <div className="flex items-center gap-8">
          <Logo size="md" className="cursor-pointer" onClick={() => navigate('/')} />
          <div className="hidden lg:flex items-center gap-8">
            {['Discover', 'Artists', 'Pricing', 'About'].map((link) => (
              <Link key={link} to={link === 'Artists' ? '/auth/artist' : `/${link.toLowerCase()}`} className="font-display font-medium text-[13px] text-white/60 hover:text-white transition-colors uppercase tracking-wider">{link}</Link>
            ))}
            <div className="bg-smash-purple/15 border border-smash-purple/25 text-smash-purple text-[10px] rounded-full px-3 py-1 font-black uppercase tracking-widest">
              FOR ARTISTS
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/auth/listener')}
              className="font-display font-medium text-[13px] text-white/50 hover:text-white transition-colors uppercase tracking-widest"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/home')}
              className="h-9 px-5 bg-smash-orange rounded-full text-white font-display font-bold text-[12px] uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Join Free
            </button>
            <button
              onClick={() => navigate('/auth/artist')}
              className="h-9 px-5 bg-smash-purple/20 border border-smash-purple/30 rounded-full text-smash-purple font-display font-bold text-[12px] uppercase tracking-widest hover:bg-smash-purple/30 transition-all"
            >
              Artist Studio
            </button>
          </div>
          <button aria-label="Toggle mobile menu" className="lg:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <div className="space-y-1.5 flex flex-col items-end">
              <motion.div animate={{ width: mobileMenuOpen ? 24 : 24, rotate: mobileMenuOpen ? 45 : 0, y: mobileMenuOpen ? 8 : 0 }} className="h-0.5 bg-white rounded-full" />
              <motion.div animate={{ opacity: mobileMenuOpen ? 0 : 1 }} className="w-4 h-0.5 bg-white rounded-full" />
              <motion.div animate={{ width: mobileMenuOpen ? 24 : 20, rotate: mobileMenuOpen ? -45 : 0, y: mobileMenuOpen ? -8 : 0 }} className="h-0.5 bg-white rounded-full" />
            </div>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#0A0A0D] pt-[72px] px-6 lg:hidden"
          >
            <div className="flex flex-col gap-6 py-10">
              {['Discover', 'Artists', 'Pricing', 'About'].map((link) => (
                <Link 
                  key={link} 
                  to={link === 'Artists' ? '/auth/artist' : `/${link.toLowerCase()}`} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-studio font-black text-4xl uppercase italic hover:text-smash-orange transition-colors"
                >
                  {link}
                </Link>
              ))}
              <div className="h-px bg-white/10 my-4" />
              <button 
                onClick={() => { navigate('/auth/listener'); setMobileMenuOpen(false); }}
                className="h-16 w-full border border-white/20 rounded-2xl font-display font-black uppercase tracking-widest"
              >
                Log In
              </button>
              <button 
                onClick={() => { navigate('/home'); setMobileMenuOpen(false); }}
                className="h-16 w-full bg-smash-orange text-white rounded-2xl font-display font-black uppercase tracking-widest shadow-xl shadow-smash-orange/20"
              >
                Sign Up Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const PricingCard = ({ title, price, features, badge, onAction, period = 'mo' }: any) => (
  <div className="bg-bg-surface border border-border-subtle rounded-[14px] p-7 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all">
    {badge && (
      <div className="mb-4">
        <span className="bg-smash-orange/10 text-smash-orange text-[10px] font-black px-3 py-1 rounded-[6px] uppercase tracking-widest">
          {badge}
        </span>
      </div>
    )}
    <h3 className="text-xl font-studio font-bold uppercase mb-2">{title}</h3>
    <div className="flex items-baseline gap-2 mb-8">
      <span className="text-4xl font-studio font-bold text-text-primary">{price}</span>
      <span className="text-[11px] font-display font-medium text-text-muted uppercase tracking-widest">MK / {period}</span>
    </div>
    <ul className="space-y-4 mb-10 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-3 text-text-secondary font-medium">
          <Check size={16} className="text-smash-orange flex-shrink-0 mt-0.5" />
          <span className="text-[13px]">{f}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onAction}
      className="w-full h-[48px] bg-white text-smash-black rounded-[10px] font-display font-semibold text-[12px] uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all active:scale-95"
    >
      GET STARTED
    </button>
  </div>
);

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [artists, setArtists] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: artistsData } = await supabase.from('profiles').select('id, full_name, stage_name, avatar_url, genre').eq('approved', true).limit(12);
      setArtists(artistsData || []);

      const today = new Date().toISOString().split('T')[0];
      const { data: topSongsData } = await supabase.from('songs').select('id, title, plays, cover_url, artists(stage_name, full_name)').eq('approved', true).lte('release_date', today).order('plays', { ascending: false }).limit(10);
      setTopSongs(topSongsData || []);

      const { data: trendingData } = await supabase.from('songs').select('id, title, artists(stage_name, full_name)').eq('approved', true).lte('release_date', today).order('plays', { ascending: false }).limit(10);
      setTrendingSongs(trendingData || []);
    };
    fetchData();
  }, []);

  

  return (
    <main className="min-h-screen bg-[#0A0A0D] text-white selection:bg-smash-orange/30 overflow-x-hidden">
      <SEO 
        title="Smashify Music | Stream & Support African Artists" 
        description="Stream, download, and buy original music from talented African artists. Support creators directly using local mobile payment systems." 
      />
      <Nav />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-[72px] px-6 md:px-12 overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/music.png')] bg-[length:100px_100px] bg-repeat">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-smash-orange/10 rounded-full blur-[140px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-smash-purple/5 rounded-full blur-[140px] -ml-32 -mb-32 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-12 items-center w-full">
          <div className="relative z-10 text-center lg:text-left">


            <h1
              className="text-[clamp(3.5rem,7vw,7rem)] font-studio font-extrabold leading-[0.88] tracking-[-0.03em] uppercase mb-8"
            >
              <span className="italic block">Stream Music.</span>
              <span className="text-smash-orange block">Support Artist.</span>
            </h1>

            <p
              className="text-[18px] font-sans text-white/60 max-w-lg leading-[1.7] mb-10 mx-auto lg:mx-0"
            >
              Discover new music. Support your favorite artists. Stream exclusive tracks, tip creators, and enjoy Africa's growing direct-to-fan music platform.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col items-center lg:items-start gap-4 mt-8 mb-16"
            >
              <button
                onClick={() => navigate('/home')}
                className="h-14 px-10 bg-smash-orange text-white rounded-full font-display font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-smash-orange/20 flex items-center justify-center gap-3 w-full sm:w-auto"
              >
                <Headphones size={20} />
                Start Listening
              </button>
              <button
                onClick={() => navigate('/artists')}
                className="flex items-center justify-center gap-2 text-smash-purple hover:text-smash-purple/80 transition-colors font-display font-bold uppercase tracking-widest text-xs pt-2"
              >
                <Mic2 size={16} />
                Are you an artist? Apply &rarr;
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 pt-10 mt-10 border-t border-white/5 w-full"
            >
              {[
                { 
                  value: 'Malawi & Africa', 
                  label: 'Proudly Built For',
                  color: 'text-white',
                  bgColor: 'bg-white/10',
                  icon: MapPin
                },
                { 
                  value: 'Direct Payouts', 
                  label: 'Airtel Money · TNM',
                  color: 'text-smash-orange',
                  bgColor: 'bg-smash-orange/10',
                  icon: Wallet
                },
                { 
                  value: '95% to Artists', 
                  label: 'No Middlemen',
                  color: 'text-smash-green',
                  bgColor: 'bg-smash-green/10',
                  icon: PieChart
                }
              ].map((stat, i) => (
                <div key={i} className="group relative flex flex-col items-center lg:items-start text-center lg:text-left p-6 lg:p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden shadow-2xl shadow-black/20 hover:-translate-y-1">
                  <div className={`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px] ${stat.bgColor} pointer-events-none translate-x-1/2 -translate-y-1/2`} />
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${stat.bgColor} border border-white/5 group-hover:scale-110 transition-transform duration-500 relative z-10 shadow-inner`}>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  
                  <span className={`text-[clamp(1.1rem,2vw,1.4rem)] font-studio font-bold leading-tight mb-2 ${stat.color} relative z-10`}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] lg:text-[11px] font-display text-white/50 uppercase tracking-[0.2em] font-semibold relative z-10">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="relative hidden lg:block h-[600px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-[400px] h-[400px]">
                {/* Center Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[300px] bg-bg-elevated border border-white/10 rounded-[24px] overflow-hidden shadow-2xl flex items-center justify-center">
                   <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-smash-orange/20 rounded-full flex items-center justify-center mx-auto mb-4 text-smash-orange">
                         <Star size={32} />
                      </div>
                      <p className="font-studio font-black text-xl uppercase italic leading-none mb-2">Exclusive</p>
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Only on Smashify</p>
                   </div>
                </div>

                {/* Artists orbit */}
                {artists.slice(0, 8).map((artist, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const radius = 180;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  const size = 50 + (i % 3) * 15;

                  return (
                    <motion.div
                      key={artist.id}
                      className="absolute left-1/2 top-1/2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        x: x - size / 2, 
                        y: y - size / 2,
                      }}
                      style={{ width: size, height: size }}
                    >
                      <motion.div
                        className="w-full h-full rounded-full border-2 border-white/10 overflow-hidden shadow-xl"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ 
                          duration: 3 + (i % 4), 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                      >
                        <img src={optimizeImage(artist.avatar_url, 80, 80)} className="w-full h-full object-cover" alt={artist.stage_name} loading="lazy" decoding="async" />
                      </motion.div>
                    </motion.div>
                  );
                })}

                {/* Now Playing Mini Card */}
                <div className="absolute bottom-10 right-0 w-[200px] h-[100px] bg-[#141418]/85 backdrop-blur-xl border border-white/8 rounded-[16px] p-4 flex items-center gap-3 shadow-2xl animate-fade-in">
                   <img src={optimizeImage("https://images.unsplash.com/photo-1514525253361-bee8718a300a?w=100", 120, 120)} className="w-[60px] h-[60px] rounded-[10px] object-cover" alt="Listen" loading="lazy" decoding="async" />
                   <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-smash-orange uppercase tracking-widest mb-1">Live Now</p>
                      <p className="text-[13px] font-display font-bold text-white truncate">Top Hits 2024</p>
                      <p className="text-[10px] text-white/40 uppercase font-medium">Smashify Radio</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker Strip */}
      <div className="h-[44px] bg-smash-orange flex items-center relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 px-4 bg-smash-orange z-10 flex items-center shadow-[10px_0_15px_rgba(255,95,0,0.5)]">
          <span className="font-display font-bold text-[10px] text-white/70 uppercase tracking-widest whitespace-nowrap">TRENDING NOW →</span>
        </div>
        <div className="flex items-center gap-12 whitespace-nowrap animate-marquee">
          {[...trendingSongs, ...trendingSongs].map((song, i) => (
            <div key={`${song.id}-${i}`} className="flex items-center gap-3">
              <span className="text-white font-studio font-bold uppercase text-[12px]">{song.title}</span>
              <span className="text-white/40 font-display text-[11px] uppercase tracking-widest">{song.artists?.stage_name || 'Various'}</span>
              <span className="w-1 h-1 rounded-full bg-white/20 mx-2" />
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <section className="py-20 px-6 md:px-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-center text-[10px] font-display font-medium text-white/40 uppercase tracking-[0.4em] mb-12">
            How Smashify Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: '🎵',
                title: 'Artist Uploads',
                desc: 'Upload your music and set your own prices'
              },
              {
                step: '02',
                icon: '❤️',
                title: 'Fans Discover',
                desc: 'Fans stream, buy tracks, and send tips directly'
              },
              {
                step: '03',
                icon: '💰',
                title: 'You Earn',
                desc: 'Money goes straight to your Smashify wallet instantly'
              },
              {
                step: '04',
                icon: '📱',
                title: 'You Withdraw',
                desc: 'Request a payout to your Airtel Money or TNM anytime'
              }
            ].map((item, i) => (
              <div key={i} className="text-center p-6 bg-white/[0.02] rounded-[20px] border border-white/5 hover:border-smash-orange/20 transition-all">
                <div className="text-3xl mb-4">{item.icon}</div>
                <div className="text-[10px] font-black text-smash-orange mb-2 tracking-widest">
                  STEP {item.step}
                </div>
                <h3 className="font-display font-bold text-sm uppercase mb-2 text-white">
                  {item.title}
                </h3>
                <p className="text-white/40 text-xs leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent/Referral Section */}
      <section className="py-20 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-smash-green/10 border border-smash-green/20 rounded-full mb-6">
            <span className="text-smash-green text-xs font-black uppercase tracking-widest">
              💼 Earn With Smashify
            </span>
          </div>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-studio font-black uppercase italic mb-4">
            Become a <span className="text-smash-green">Smashify Agent</span>
          </h2>
          <p className="text-white/50 text-base mb-10 max-w-2xl mx-auto">
            Know artists, producers, or musicians? Refer them to Smashify and earn 5% of their first subscription payment — every time you bring someone on board.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                emoji: '🤝',
                title: 'Refer an Artist',
                desc: 'Share your unique agent link with any artist who needs to monetize their music'
              },
              {
                emoji: '💰',
                title: 'They Subscribe',
                desc: 'When they pay their first Rising Star, Standard or Elite plan — you earn 5%'
              },
              {
                emoji: '📱',
                title: 'You Get Paid',
                desc: 'Your commission goes straight to your Airtel Money or TNM Mpamba number'
              }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/10 text-left">
                <div className="text-3xl mb-4">{item.emoji}</div>
                <h3 className="font-bold text-sm mb-2">{item.title}</h3>
                <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-smash-green/10 border border-smash-green/20 rounded-2xl p-6 mb-8 inline-block">
            <p className="text-smash-green font-bold text-sm">
              Example: You refer 10 artists who each pay MK 8,000 Rising Star
            </p>
            <p className="text-2xl font-black mt-1">You earn MK 4,000 💚</p>
            <p className="text-white/40 text-xs mt-1">5% × MK 8,000 × 10 artists</p>
          </div>
          <br />
          <a
            href="https://wa.me/265883728868?text=I%20want%20to%20become%20a%20Smashify%20Agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 h-14 px-10 bg-smash-green text-white rounded-full font-display font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-smash-green/20"
          >
            Apply to Become an Agent →
          </a>
        </div>
      </section>

      {/* Featured Artists */}
      <section className="pt-24 pb-12 px-6 md:px-12 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="font-display font-medium text-[10px] uppercase tracking-[0.3em] text-white/40">Featured Artists</h2>
            <Link to="/auth/artist" className="font-display font-semibold text-[10px] uppercase tracking-widest text-smash-orange hover:underline">See All</Link>
          </div>
          <div className="flex gap-10 overflow-x-auto pb-8 hide-scrollbar scroll-smooth" style={{ maskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}>
            {artists.map((artist) => (
              <div key={artist.id} className="flex-shrink-0 w-[110px] flex flex-col items-center group cursor-pointer" onClick={() => navigate(`/artist/${artist.id}`)}>
                <div className="w-20 h-20 rounded-full border-2 border-white/8 overflow-hidden transition-all duration-300 group-hover:border-smash-orange/40 group-hover:scale-[1.05]">
                  <img src={optimizeImage(artist.avatar_url, 120, 120)} className="w-full h-full object-cover" alt={artist.stage_name} loading="lazy" decoding="async" />
                </div>
                <p className="font-display font-semibold text-[13px] text-center mt-3 truncate w-full group-hover:text-smash-orange transition-colors">{artist.stage_name || artist.full_name}</p>
                <p className="font-display text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{artist.genre || 'Afro'}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Top 10 */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <p className="font-studio font-bold text-[14px] text-white/40 uppercase tracking-widest mb-2">This Week's</p>
              <h2 className="text-[clamp(3rem,6vw,5rem)] font-studio font-extrabold text-white leading-none uppercase">Top Songs</h2>
            </div>
            <div className="flex items-center gap-2 text-white/40 mb-2">
              <div className="w-2 h-2 rounded-full bg-smash-green shadow-[0_0_8px_rgba(0,214,143,0.5)]" />
              <span className="font-display font-medium text-[11px] uppercase tracking-widest">Updated Weekly</span>
            </div>
          </div>

          <div className="space-y-0">
            {topSongs.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group h-[72px] flex items-center border-b border-white/6 hover:bg-white/[0.02] px-2 transition-colors cursor-pointer"
              >
                <span className={`font-studio font-extrabold text-[42px] w-[72px] text-right italic ${
                  i === 0 ? 'text-smash-orange' : 
                  i === 1 ? 'text-white/70' : 
                  i === 2 ? 'text-white/50' : 'text-white/20'
                }`}>
                  {i + 1}
                </span>
                <div className="w-[52px] h-[52px] rounded-[10px] bg-white/5 overflow-hidden ml-6 shrink-0 shadow-lg">
                   <img src={optimizeImage(song.cover_url, 120, 120)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={song.title} loading="lazy" decoding="async" />
                </div>
                <div className="flex-1 ml-6 min-w-0">
                  <p className="font-display font-bold text-[15px] truncate group-hover:text-smash-orange transition-colors uppercase italic tracking-tight">{song.title}</p>
                  <p className="font-display text-[12px] text-white/50 uppercase tracking-wider">{song.artists?.stage_name || song.artists?.full_name}</p>
                </div>
                <div className="flex items-center gap-10">
                   <span className="font-display font-medium text-[12px] text-white/30 hidden md:block">{(song.plays || 0).toLocaleString()} PLAYS</span>
                   <button aria-label="Play song" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-smash-orange hover:text-white transition-all transform hover:scale-110">
                      <Play size={16} fill="currentColor" />
                   </button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center mt-16">
            <button className="h-[52px] px-10 rounded-full border-2 border-white/20 text-white font-display font-semibold text-[14px] uppercase tracking-widest hover:bg-white hover:text-[#0A0A0D] transition-all hover:border-white">
              See Full Chart
            </button>
          </div>
        </div>
      </section>

      {/* Why Smashify */}
      <section className="py-32 px-6 md:px-12 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
             <h2 className="text-[10px] font-display font-medium text-smash-orange uppercase tracking-[0.4em] mb-4">Core Platform</h2>
             <h3 className="text-5xl md:text-8xl font-studio font-black italic uppercase tracking-tighter leading-none">Why <span className="text-smash-orange">Smashify?</span></h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
               { icon: Infinity, title: 'Free Streaming', color: 'text-smash-orange', desc: 'Listen to all your favorite hits — no subscription required to stream.' },
               { icon: Heart, title: 'Direct Support', color: 'text-red-400', desc: 'Buy songs & send donations directly via Airtel Money or TNM Mpamba.' },
               { icon: Download, title: 'Offline Mode', color: 'text-smash-cyan', desc: 'Download songs with Premium. Listen anywhere, anytime.' },
               { icon: Smartphone, title: 'Install as App', color: 'text-smash-purple', desc: 'Install Smashify on your phone like a native app — no app store needed.' },
               { icon: LayoutDashboard, title: 'Smart Queue', color: 'text-smash-green', desc: 'Shuffle, repeat, feed view, crossfade & full player controls built in.' },
               { icon: ShieldCheck, title: 'Artist First', color: 'text-white/70', desc: 'Up to 95% payouts, transparent earnings, withdrawals via mobile money.' }
             ].map((feat, i) => (
                <div key={i} className="bg-bg-surface border border-border-subtle rounded-[14px] p-6 hover:border-smash-orange/30 transition-all group">
                   <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <feat.icon className={feat.color} size={24} />
                   </div>
                   <h3 className="text-[18px] font-studio font-bold uppercase italic text-white mb-3 tracking-tight">{feat.title}</h3>
                   <p className="text-white/50 text-[14px] leading-relaxed font-sans">{feat.desc}</p>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto border border-white/8 rounded-[40px] overflow-hidden bg-bg-surface flex flex-col md:flex-row">
           <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center">
              <h2 className="text-3xl lg:text-5xl font-studio font-bold uppercase italic text-white mb-6">Our Vision</h2>
              <p className="text-white/60 text-lg lg:text-xl font-sans leading-relaxed">
                To create a music economy where African artists thrive — from Malawi to Nigeria, from Nairobi to Cape Town. No middlemen. No waiting. Direct from fan to artist.
              </p>
           </div>
           <div className="w-px bg-white/8 hidden md:block" />
           <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center">
              <h2 className="text-3xl lg:text-5xl font-studio font-bold uppercase italic text-white mb-6">Our Mission</h2>
              <p className="text-white/60 text-lg lg:text-xl font-sans leading-relaxed">
                A fair, transparent platform where African artists keep up to 95% of their earnings and fans enjoy unlimited access to the continent's best music — powered by local mobile money.
              </p>
           </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pt-24 px-6 md:px-12 bg-gradient-to-b from-transparent to-[#141418]/50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-smash-orange/8 border-t border-b border-smash-orange/15 py-24 px-6 rounded-[40px] mb-20 text-center">
             <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-studio font-black uppercase text-white leading-tight mb-4">Stream free forever.</h2>
             <p className="text-[18px] font-sans text-white/60 mb-10 max-w-xl mx-auto">Or go Premium for MK 2,000/month to unlock the full potential of Smahify.</p>
             <div className="flex flex-wrap items-center justify-center gap-4">
                <button className="h-[52px] px-10 bg-smash-orange text-white rounded-full font-display font-semibold text-[13px] uppercase tracking-widest shadow-xl shadow-smash-orange/20">Upgrade Now</button>
                <button className="h-[52px] px-10 bg-transparent border-2 border-white text-white rounded-full font-display font-semibold text-[13px] uppercase tracking-widest hover:bg-white hover:text-black transition-colors">Compare Plans</button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
             <PricingCard 
                title="Free" 
                price="0" 
                onAction={() => navigate('/home')}
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
                price="2,000" 
                badge="MOST POPULAR"
                onAction={() => navigate('/home')}
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
                price="5,000" 
                onAction={() => navigate('/home')}
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

      {/* Artist CTA Section */}
      <section className="py-32 px-6 md:px-12 relative overflow-hidden bg-bg-surface">
         <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
            <div className="hidden lg:block w-[40%] h-[500px] relative rounded-[32px] overflow-hidden group">
               <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1000" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s]" alt="Artist Performing" loading="lazy" decoding="async" />
               <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#141418] pointer-events-none" />
            </div>
            <div className="flex-1 text-center lg:text-left">
               <p className="font-display font-medium text-[10px] text-smash-orange uppercase tracking-[0.4em] mb-4">For Content Creators</p>
               <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-studio font-extrabold uppercase italic text-white mb-6 leading-tight">ARE YOU AN ARTIST?</h2>
               <p className="text-white/50 text-[18px] font-sans leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
                  Join artists across Africa already monetising their music directly. Keep your rights. Keep your revenue. Get paid via mobile money within 24 hours.
               </p>
               <button 
                  onClick={() => navigate('/auth/artist')}
                  className="h-[52px] px-10 bg-smash-orange text-white rounded-[10px] font-display font-semibold text-[13px] uppercase tracking-widest shadow-xl shadow-smash-orange/20"
               >
                  Apply as Artist
               </button>
            </div>
         </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
};

export default Landing;

