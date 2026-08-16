import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Headphones, Check, Star, Play, 
  Wallet, UploadCloud, Banknote, Smartphone,
  Infinity as InfinityIcon, Download, ShieldCheck, Heart, LayoutDashboard,
  ArrowRight, Shield, Mic2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { supabase } from '../lib/supabase';
import { optimizeImage } from '../lib/imageUtils';
import SEO from '../components/common/SEO';
import Footer from '../components/common/Footer';

// Section Reveal Component with Reduced-Motion Support
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  key?: React.Key;
}

const FadeIn: React.FC<FadeInProps> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const Nav = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav 
        id="landing-nav"
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center justify-between px-6 md:px-12 transition-all duration-200 border-b ${
          isScrolled || mobileMenuOpen 
            ? 'bg-[#0A0A0A]/85 backdrop-blur-xl border-white/8' 
            : 'bg-transparent border-transparent'
        }`}
      >
        <div className="flex items-center gap-8">
          <Logo size="md" className="cursor-pointer" onClick={() => navigate('/')} />
          <div className="hidden lg:flex items-center gap-7">
            {['Discover', 'Artists', 'Pricing', 'About'].map((link) => (
              <Link 
                key={link} 
                to={link === 'Artists' ? '/auth/artist' : `/${link.toLowerCase()}`} 
                className="text-[14px] font-medium text-[#B0B0B0] hover:text-[#FFFFFF] transition-colors tracking-normal"
              >
                {link}
              </Link>
            ))}
            <div className="bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] text-[10px] rounded-full px-2.5 py-0.5 font-semibold tracking-wider uppercase">
              For Artists
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/auth/listener')}
              className="px-4 py-2 text-[14px] font-medium text-[#B0B0B0] hover:text-[#FFFFFF] transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/home')}
              className="h-10 px-5 bg-transparent border border-white/10 hover:border-white/30 text-white rounded-[10px] text-[13px] font-semibold transition-all"
            >
              Join Free
            </button>
            <button
              onClick={() => navigate('/auth/artist')}
              className="h-10 px-5 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] hover:brightness-110 text-white rounded-[10px] text-[13px] font-semibold transition-all shadow-[0_4px_20px_rgba(0,163,255,0.25)]"
            >
              Artist Studio
            </button>
          </div>

          <button 
            id="mobile-menu-toggle"
            aria-label="Toggle mobile menu" 
            className="lg:hidden text-white p-2" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="space-y-1.5 flex flex-col items-end">
              <motion.div animate={{ width: 24, rotate: mobileMenuOpen ? 45 : 0, y: mobileMenuOpen ? 8 : 0 }} className="h-0.5 bg-white rounded-full" />
              <motion.div animate={{ opacity: mobileMenuOpen ? 0 : 1 }} className="w-4 h-0.5 bg-white rounded-full" />
              <motion.div animate={{ width: mobileMenuOpen ? 24 : 18, rotate: mobileMenuOpen ? -45 : 0, y: mobileMenuOpen ? -8 : 0 }} className="h-0.5 bg-white rounded-full" />
            </div>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 z-40 bg-[#0A0A0A] pt-[84px] px-6 lg:hidden flex flex-col justify-between pb-8"
          >
            <div className="flex flex-col gap-5 py-4">
              {['Discover', 'Artists', 'Pricing', 'About'].map((link) => (
                <Link 
                  key={link} 
                  to={link === 'Artists' ? '/auth/artist' : `/${link.toLowerCase()}`} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-bold text-white hover:text-[#00A3FF] transition-colors"
                >
                  {link}
                </Link>
              ))}
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-white/8">
              <button 
                onClick={() => { navigate('/auth/listener'); setMobileMenuOpen(false); }}
                className="h-12 w-full border border-white/10 rounded-[10px] font-semibold text-[14px] text-white hover:border-white/30"
              >
                Log In
              </button>
              <button 
                onClick={() => { navigate('/home'); setMobileMenuOpen(false); }}
                className="h-12 w-full bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white rounded-[10px] font-semibold text-[14px] shadow-lg shadow-[#00A3FF]/20"
              >
                Join Free
              </button>
              <button 
                onClick={() => { navigate('/auth/artist'); setMobileMenuOpen(false); }}
                className="h-12 w-full bg-[#1A1A1A] border border-white/10 text-white rounded-[10px] font-semibold text-[14px]"
              >
                Artist Studio
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const [artists, setArtists] = useState<any[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: artistsData } = await supabase
        .from('profiles')
        .select('id, full_name, stage_name, avatar_url, genre')
        .eq('user_type', 'artist')
        .not('stage_name', 'is', null)
        .limit(12);
      setArtists(artistsData || []);

      const today = new Date().toISOString().split('T')[0];
      const { data: topSongsData } = await supabase
        .from('songs')
        .select('id, title, plays, cover_url, profiles:artist_id(stage_name, full_name)')
        .eq('approved', true)
        .lte('release_date', today)
        .order('plays', { ascending: false })
        .limit(10);
      setTopSongs(topSongsData || []);

      const { data: trendingData } = await supabase
        .from('songs')
        .select('id, title, profiles:artist_id(stage_name, full_name)')
        .eq('approved', true)
        .lte('release_date', today)
        .order('plays', { ascending: false })
        .limit(10);
      setTrendingSongs(trendingData || []);
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#00A3FF]/30 overflow-x-hidden font-sans">
      <SEO 
        title="Smashify Music | Stream & Support African Artists" 
        description="Stream, download, and buy original music from talented African artists. Support creators directly using local mobile payment systems." 
      />
      <Nav />

      {/* 1. Hero Section */}
      <section className="relative min-h-[92vh] flex items-center pt-[96px] pb-16 px-6 md:px-12 overflow-hidden bg-[#0A0A0A]">
        {/* Full-bleed Hero Stage Photography Backdrop */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img 
            src="/hero.jpg" 
            alt="" 
            className="w-full h-full object-cover object-center opacity-25 scale-105 filter blur-[1px]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/85 to-[#0A0A0A]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/80" />
        </div>

        {/* Subtle Signature Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#00A3FF]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-[#0084D6]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full relative z-10">
          <div className="lg:col-span-7 text-center lg:text-left">
            {/* Overline Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/8 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.18em]">
                AFRICA'S DIRECT FAN-TO-ARTIST PLATFORM
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-[44px] sm:text-[64px] lg:text-[80px] font-extrabold font-display leading-[1.05] tracking-[-0.02em] text-white mb-6">
              Stream Music. <br className="hidden sm:inline" />
              <span className="text-[#00A3FF]">Support Artists.</span>
            </h1>

            {/* Subline */}
            <p className="text-[16px] md:text-[18px] text-[#B0B0B0] max-w-xl leading-[1.6] mb-8 mx-auto lg:mx-0">
              Discover original tracks, stream without limits, and send tips directly to African creators with local mobile money.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <button
                id="hero-start-listening-btn"
                onClick={() => navigate('/home')}
                className="h-12 px-8 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] hover:brightness-110 text-white rounded-[10px] text-[14px] font-semibold transition-all shadow-[0_4px_20px_rgba(0,163,255,0.3)] flex items-center justify-center gap-2.5 w-full sm:w-auto"
              >
                <Headphones size={18} />
                Start Listening
              </button>
              
              <a
                id="hero-download-apk-btn"
                href="/downloads/Smashify.apk"
                download="Smashify.apk"
                className="h-12 px-7 bg-transparent border border-white/10 hover:border-white/30 text-white rounded-[10px] text-[14px] font-semibold transition-all flex items-center justify-center gap-2.5 w-full sm:w-auto"
              >
                <Smartphone size={18} />
                Download Android App
              </a>

              <button
                id="hero-artist-cta-btn"
                onClick={() => navigate('/auth/artist')}
                className="h-12 px-7 bg-white/[0.04] border border-white/10 hover:border-[#00A3FF]/50 text-white hover:text-[#00A3FF] rounded-[10px] text-[14px] font-semibold transition-all flex items-center justify-center gap-2.5 w-full sm:w-auto"
              >
                <Mic2 size={18} className="text-[#00A3FF]" />
                For Artists
              </button>
            </div>

            {/* Secondary artist link */}
            <p className="text-[13px] text-[#B0B0B0] mt-4 mb-12">
              Are you an artist?{" "}
              <Link to="/auth/artist" className="text-[#00A3FF] font-medium hover:underline underline-offset-4 transition-all">
                Apply for the Artist Studio →
              </Link>
            </p>

            {/* Trust Row */}
            <div className="pt-8 border-t border-white/8 grid grid-cols-3 gap-3 text-left">
              <div className="pr-2">
                <p className="text-white text-[15px] font-bold mb-0.5">95% to Artists</p>
                <p className="text-[#B0B0B0] text-[12px]">Direct creator payouts</p>
              </div>
              <div className="border-l border-white/8 pl-4 pr-2">
                <p className="text-white text-[15px] font-bold mb-0.5">Airtel & Mpamba</p>
                <p className="text-[#B0B0B0] text-[12px]">Local mobile money</p>
              </div>
              <div className="border-l border-white/8 pl-4">
                <p className="text-white text-[15px] font-bold mb-0.5">Offline Saves</p>
                <p className="text-[#B0B0B0] text-[12px]">High-res audio</p>
              </div>
            </div>
          </div>

          {/* Right Hero Stage Visual */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="relative rounded-[20px] overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-2xl p-4">
              <div className="relative h-[420px] rounded-[14px] overflow-hidden bg-[#0A0A0A]">
                <img 
                  src={topSongs.length > 0 && topSongs[0].cover_url ? optimizeImage(topSongs[0].cover_url, 600, 600) : '/hero.jpg'} 
                  alt="Featured track" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                  loading="eager"
                />
                
                {/* Backdrop Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent pointer-events-none" />

                {/* Floating Now Playing Pill */}
                {topSongs.length > 0 ? (
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-[12px] bg-[#1A1A1A]/90 backdrop-blur-md border border-white/10 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="text-[10px] font-semibold text-[#00A3FF] uppercase tracking-wider block mb-0.5">
                        FEATURED RELEASE
                      </span>
                      <p className="text-white text-[14px] font-bold truncate">{topSongs[0].title}</p>
                      <p className="text-[#B0B0B0] text-[12px] truncate">
                        {topSongs[0].profiles?.stage_name || topSongs[0].profiles?.full_name || 'Smashify Artist'}
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate('/home')}
                      className="w-10 h-10 rounded-full bg-[#00A3FF] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all shadow-lg shadow-[#00A3FF]/30"
                      aria-label="Play featured release"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                ) : (
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-[12px] bg-[#1A1A1A]/90 backdrop-blur-md border border-white/10 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="text-[10px] font-semibold text-[#00A3FF] uppercase tracking-wider block mb-0.5">
                        DISCOVER MUSIC
                      </span>
                      <p className="text-white text-[14px] font-bold truncate">Explore African Originals</p>
                      <p className="text-[#B0B0B0] text-[12px] truncate">Top Trending Releases</p>
                    </div>
                    <button 
                      onClick={() => navigate('/home')}
                      className="w-10 h-10 rounded-full bg-[#00A3FF] text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all shadow-lg shadow-[#00A3FF]/30"
                      aria-label="Play featured release"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Ticker Strip */}
      {trendingSongs.length > 0 && (
        <div className="h-[44px] bg-[#141414] border-y border-white/8 flex items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-[#141414] z-10 flex items-center border-r border-white/8">
            <span className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
              TRENDING NOW <ArrowRight size={12} />
            </span>
          </div>
          <div className="flex items-center gap-12 whitespace-nowrap animate-marquee pl-44 hover:[animation-play-state:paused]" aria-hidden="true">
            {[...trendingSongs, ...trendingSongs].map((song, i) => (
              <div key={`${song.id}-${i}`} className="flex items-center gap-2.5">
                <span className="text-white text-[13px] font-medium">{song.title}</span>
                <span className="text-[#B0B0B0] text-[12px]">
                  {song.profiles?.stage_name || song.profiles?.full_name || 'Various'}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20 mx-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. How It Works */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-b border-white/8">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="mb-14">
            <p className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-[0.18em] mb-2">
              HOW IT WORKS
            </p>
            <h2 className="text-[32px] md:text-[40px] font-bold font-display text-white tracking-[-0.01em]">
              Simple, direct, transparent.
            </h2>
            <p className="text-[#B0B0B0] text-[15px] max-w-xl mt-1">
              Built for African artists to monetize music and fans to stream freely.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01',
                icon: <UploadCloud size={24} className="text-[#00A3FF]" />,
                title: 'Artist Uploads',
                desc: 'Upload high-quality tracks, set prices, and manage your releases from Artist Studio.'
              },
              {
                num: '02',
                icon: <Headphones size={24} className="text-[#00A3FF]" />,
                title: 'Fans Discover',
                desc: 'Fans stream playlists, buy full audio downloads, and send direct tips to support you.'
              },
              {
                num: '03',
                icon: <Wallet size={24} className="text-[#00A3FF]" />,
                title: 'Direct Earnings',
                desc: 'Revenue and tip payments flow immediately into your Smashify wallet balance.'
              },
              {
                num: '04',
                icon: <Banknote size={24} className="text-[#00A3FF]" />,
                title: 'Mobile Payouts',
                desc: 'Withdraw your royalties straight to Airtel Money or TNM Mpamba whenever you want.'
              }
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.08} className="h-full">
                <div className="bg-[#1A1A1A] border border-white/8 rounded-[16px] p-6 h-full flex flex-col justify-between hover:border-white/20 hover:-translate-y-1 transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-10 rounded-[10px] bg-white/[0.04] border border-white/8 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <span className="text-[28px] font-extrabold font-display text-[#00A3FF]/20 select-none">
                        {item.num}
                      </span>
                    </div>
                    <h3 className="text-[17px] font-bold text-white mb-2 font-display">
                      {item.title}
                    </h3>
                    <p className="text-[#B0B0B0] text-[14px] leading-[1.6]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Top Songs / Weekly Chart */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-b border-white/8">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-[0.18em] mb-2">
                THIS WEEK'S
              </p>
              <h2 className="text-[32px] md:text-[40px] font-bold font-display text-white tracking-[-0.01em]">
                Top Songs
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-[12px] font-medium text-[#B0B0B0] uppercase tracking-wider">
                Live Chart
              </span>
            </div>
          </FadeIn>

          <div className="divide-y divide-white/8 border-y border-white/8">
            {topSongs.slice(0, 5).map((song, i) => (
              <div
                key={song.id}
                onClick={() => navigate('/home')}
                className="group py-3.5 px-3 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors rounded-[10px] cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`text-[18px] font-bold font-display w-6 text-center shrink-0 ${
                    i === 0 ? 'text-[#00A3FF]' : 'text-[#B0B0B0]'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="w-12 h-12 rounded-[8px] bg-[#1A1A1A] overflow-hidden shrink-0 border border-white/8">
                    <img 
                      src={optimizeImage(song.cover_url, 120, 120)} 
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      loading="lazy" 
                      decoding="async" 
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-white truncate group-hover:text-[#00A3FF] transition-colors">
                      {song.title}
                    </p>
                    <p className="text-[13px] text-[#B0B0B0] truncate">
                      {song.profiles?.stage_name || song.profiles?.full_name || 'Smashify Artist'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <span className="text-[12px] text-[#B0B0B0] hidden sm:block">
                    {(song.plays || 0).toLocaleString()} plays
                  </span>
                  <button 
                    aria-label={`Play ${song.title}`}
                    className="w-9 h-9 rounded-full bg-white/[0.06] group-hover:bg-[#00A3FF] text-white flex items-center justify-center transition-all"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={() => navigate('/discover')}
              className="h-11 px-6 border border-white/10 hover:border-white/30 text-white rounded-[10px] text-[13px] font-semibold transition-all"
            >
              See Full Chart
            </button>
          </div>
        </div>
      </section>

      {/* 5. Featured Artists */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-b border-white/8">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="flex items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-[0.18em] mb-2">
                FEATURED CREATORS
              </p>
              <h2 className="text-[32px] md:text-[40px] font-bold font-display text-white tracking-[-0.01em]">
                Featured Artists
              </h2>
            </div>
            <Link 
              to="/discover" 
              className="h-10 px-5 border border-white/10 hover:border-white/30 text-white rounded-[10px] text-[13px] font-semibold transition-all flex items-center gap-2 shrink-0"
            >
              See All
            </Link>
          </FadeIn>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {artists.slice(0, 12).map((artist, idx) => (
              <FadeIn key={artist.id} delay={idx * 0.04}>
                <div 
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  className="group bg-[#1A1A1A] border border-white/8 rounded-[16px] p-4 flex flex-col items-center text-center cursor-pointer hover:border-white/20 hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[12px] overflow-hidden bg-[#0A0A0A] border border-white/8 mb-3">
                    <img 
                      src={optimizeImage(artist.avatar_url, 160, 160)} 
                      alt={artist.stage_name || artist.full_name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="text-[14px] font-bold text-white truncate w-full group-hover:text-[#00A3FF] transition-colors">
                    {artist.stage_name || artist.full_name}
                  </p>
                  <p className="text-[12px] text-[#B0B0B0] truncate w-full mt-0.5">
                    {artist.genre || 'Afrobeat / Urban'}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Agent/Referral Section */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-b border-white/8 bg-[#1A1A1A]/40">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full mb-4">
              <span className="text-[#22C55E] text-[11px] font-semibold uppercase tracking-[0.18em]">
                EARN WITH SMASHIFY
              </span>
            </div>
            <h2 className="text-[32px] md:text-[44px] font-bold font-display text-white tracking-[-0.01em] mb-4">
              Become a Smashify Agent
            </h2>
            <p className="text-[#B0B0B0] text-[16px] mb-10 max-w-xl mx-auto leading-[1.6]">
              Refer artists, producers, or podcasters to Smashify and earn a 5% commission on their first subscription payment.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 text-left">
            {[
              {
                title: 'Refer an Artist',
                desc: 'Share your unique agent link with creators who want to monetize their catalogue.'
              },
              {
                title: 'They Subscribe',
                desc: 'When they activate their Rising Star, Standard, or Elite studio tier, you earn 5%.'
              },
              {
                title: 'You Get Paid',
                desc: 'Your commission is transferred directly to your Airtel Money or TNM Mpamba line.'
              }
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="bg-[#1A1A1A] border border-white/8 rounded-[16px] p-6 h-full">
                  <div className="text-[12px] font-bold text-[#22C55E] uppercase tracking-wider mb-2">
                    Step 0{i + 1}
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-2 font-display">
                    {step.title}
                  </h3>
                  <p className="text-[#B0B0B0] text-[14px] leading-[1.6]">
                    {step.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Calculator Card */}
          <FadeIn delay={0.25} className="mb-8 inline-block w-full max-w-lg">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 text-center shadow-lg">
              <p className="text-[#B0B0B0] text-[13px] mb-1">
                Example: Refer 10 artists subscribing to Rising Star (MK 8,000)
              </p>
              <div className="text-[28px] md:text-[34px] font-extrabold text-[#22C55E] my-1 font-display">
                MK 4,000
              </div>
              <p className="text-[#B0B0B0] text-[12px]">
                5% commission × MK 8,000 × 10 artists
              </p>
            </div>
          </FadeIn>

          <div>
            <Link
              to="/agent"
              className="inline-flex items-center gap-2 h-12 px-8 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] hover:brightness-110 text-white rounded-[10px] text-[14px] font-semibold transition-all shadow-[0_4px_20px_rgba(0,163,255,0.25)]"
            >
              Apply to become an agent <ArrowRight size={16} />
            </Link>
            <div className="mt-4">
              <a
                href="https://wa.me/265883728868"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#B0B0B0] hover:text-white transition-colors"
              >
                Questions? WhatsApp +265 88 372 88 68
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Core Platform Features */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-b border-white/8">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-[0.18em] mb-2">
              PLATFORM FEATURES
            </p>
            <h2 className="text-[32px] md:text-[40px] font-bold font-display text-white tracking-[-0.01em]">
              Why Choose Smashify?
            </h2>
            <p className="text-[#B0B0B0] text-[15px] max-w-xl mx-auto mt-1">
              Built specifically for modern African music ecosystems.
            </p>
          </FadeIn>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: InfinityIcon, title: 'Free Streaming', desc: 'Listen to all original catalog tracks with zero mandatory subscriptions.' },
              { icon: Heart, title: 'Direct Fan Support', desc: 'Buy releases & send tips straight to artist wallets with Airtel Money & TNM.' },
              { icon: Download, title: 'Offline Playback', desc: 'Save high-bitrate tracks to local storage and enjoy music anywhere without data.' },
              { icon: Smartphone, title: 'Progressive Web App', desc: 'Install Smashify directly to your home screen with zero app store delays.' },
              { icon: LayoutDashboard, title: 'Advanced Player', desc: 'Smart queues, lyrics viewer, full playback controls, and background streaming.' },
              { icon: ShieldCheck, title: 'Creator Protections', desc: 'Retain 100% of your copyright, master rights, and receive up to 95% payouts.' }
            ].map((feat, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div className="bg-[#1A1A1A] border border-white/8 rounded-[16px] p-6 hover:border-white/20 hover:-translate-y-1 transition-all duration-200 h-full">
                  <div className="w-10 h-10 rounded-[10px] bg-white/[0.04] border border-white/8 flex items-center justify-center mb-5 text-[#00A3FF]">
                    <feat.icon size={20} />
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-2 font-display">
                    {feat.title}
                  </h3>
                  <p className="text-[#B0B0B0] text-[14px] leading-[1.6]">
                    {feat.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Pricing Plans */}
      <section className="py-20 md:py-28 px-6 md:px-12 border-b border-white/8">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-[11px] font-semibold text-[#00A3FF] uppercase tracking-[0.18em] mb-2">
              TRANSPARENT PRICING
            </p>
            <h2 className="text-[32px] md:text-[40px] font-bold font-display text-white tracking-[-0.01em]">
              Simple Plans for Every Listener
            </h2>
            <p className="text-[#B0B0B0] text-[15px] max-w-xl mx-auto mt-1">
              Stream free anytime, or upgrade for high-fidelity audio and offline downloads.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free */}
            <FadeIn delay={0.05} className="h-full">
              <div className="bg-[#1A1A1A] border border-white/8 rounded-[16px] p-7 flex flex-col justify-between h-full">
                <div>
                  <div className="text-[18px] font-bold text-white mb-1 font-display">Free</div>
                  <div className="flex items-baseline gap-1.5 my-5">
                    <span className="text-[36px] font-bold font-display text-white">MK 0</span>
                    <span className="text-[#B0B0B0] text-[13px]">/ mo</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Standard audio streaming (128kbps)",
                      "Ad-supported catalog access",
                      "Buy tracks & tip artists directly",
                      "Web & mobile PWA playback"
                    ].map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[14px] text-[#B0B0B0]">
                        <Check size={16} className="text-[#22C55E] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => navigate('/home')}
                  className="w-full h-11 bg-transparent border border-white/10 hover:border-white/30 text-white rounded-[10px] text-[13px] font-semibold transition-all"
                >
                  Start Free
                </button>
              </div>
            </FadeIn>

            {/* Premium (Recommended) */}
            <FadeIn delay={0.1} className="h-full">
              <div className="bg-[#1A1A1A] border border-[#00A3FF] shadow-[0_0_30px_rgba(0,163,255,0.15)] rounded-[16px] p-7 flex flex-col justify-between h-full relative">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[18px] font-bold text-white font-display">Premium</div>
                    <span className="bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF] text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                      Recommended
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 my-5">
                    <span className="text-[36px] font-bold font-display text-white">MK 2,000</span>
                    <span className="text-[#B0B0B0] text-[13px]">/ mo</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Ad-free uninterrupted streaming",
                      "Studio quality audio (320kbps)",
                      "Offline downloads (50 songs)",
                      "Unlimited skips & queue management",
                      "Synchronized lyrics & stats",
                      "Priority customer support"
                    ].map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[14px] text-white">
                        <Check size={16} className="text-[#22C55E] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => navigate('/pricing')}
                  className="w-full h-11 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] hover:brightness-110 text-white rounded-[10px] text-[13px] font-semibold transition-all shadow-[0_4px_16px_rgba(0,163,255,0.25)]"
                >
                  Upgrade to Premium
                </button>
              </div>
            </FadeIn>

            {/* Family */}
            <FadeIn delay={0.15} className="h-full">
              <div className="bg-[#1A1A1A] border border-white/8 rounded-[16px] p-7 flex flex-col justify-between h-full">
                <div>
                  <div className="text-[18px] font-bold text-white mb-1 font-display">Family</div>
                  <div className="flex items-baseline gap-1.5 my-5">
                    <span className="text-[36px] font-bold font-display text-white">MK 5,000</span>
                    <span className="text-[#B0B0B0] text-[13px]">/ mo</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {[
                      "5 separate Premium listener accounts",
                      "Ad-free listening for the whole family",
                      "Offline downloads on each account",
                      "Individual playlists & listening history",
                      "One consolidated monthly billing"
                    ].map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[14px] text-[#B0B0B0]">
                        <Check size={16} className="text-[#22C55E] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                  onClick={() => navigate('/pricing')}
                  className="w-full h-11 bg-transparent border border-white/10 hover:border-white/30 text-white rounded-[10px] text-[13px] font-semibold transition-all"
                >
                  Get Family Plan
                </button>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* 9. CTA Band */}
      <section className="py-20 md:py-28 px-6 md:px-12 relative overflow-hidden">
        <div className="max-w-5xl mx-auto bg-[#1A1A1A] border border-white/10 rounded-[20px] p-8 md:p-14 text-center relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00A3FF]/15 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-[32px] md:text-[48px] font-bold font-display text-white tracking-[-0.02em] mb-4">
              Stream free forever.
            </h2>
            <p className="text-[#B0B0B0] text-[16px] max-w-lg mx-auto mb-8 leading-[1.6]">
              Join thousands of listeners enjoying Africa's finest music while empowering creators with direct royalties.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/home')}
                className="h-12 px-8 bg-gradient-to-r from-[#00A3FF] to-[#0084D6] hover:brightness-110 text-white rounded-[10px] text-[14px] font-semibold transition-all shadow-[0_4px_20px_rgba(0,163,255,0.3)] w-full sm:w-auto"
              >
                Start Listening Now
              </button>
              <button
                onClick={() => navigate('/auth/artist')}
                className="h-12 px-7 bg-transparent border border-white/10 hover:border-white/30 text-white rounded-[10px] text-[14px] font-semibold transition-all w-full sm:w-auto"
              >
                Join as an Artist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <Footer />
    </main>
  );
};

export default Landing;
