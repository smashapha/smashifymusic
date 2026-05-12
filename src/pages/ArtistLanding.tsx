import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, animate } from 'motion/react';
import { 
  Upload, Wallet, BarChart3, Tag, Disc, 
  Heart, Rocket, Star, CheckCircle2, ChevronRight,
  ShieldCheck, Globe, Zap, Headphones
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';

function CountUpStat({ to, suffix, label, textValue }: { to?: number, suffix?: string, label: string, textValue?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  
  useEffect(() => {
    if (isInView && to !== undefined) {
      const controls = animate(0, to, {
        duration: 2,
        ease: "easeOut",
        onUpdate(value) {
          setVal(Math.round(value));
        }
      });
      return () => controls.stop();
    }
  }, [isInView, to]);

  return (
    <div ref={ref}>
      <p className="text-[32px] md:text-[48px] font-studio font-bold text-smash-purple mb-1">
        {textValue ? textValue : <>{val}{suffix}</>}
      </p>
      <p className="text-[11px] font-display font-medium text-text-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}

const ArtistLanding: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const features = [
    { icon: Upload, title: 'Easy Upload', desc: 'Upload single songs or full albums. Cover art, lyrics, price — all in one place.', color: 'text-smash-orange', bg: 'bg-smash-orange/10' },
    { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track plays, followers, revenue by song and by month. Know what\'s working.', color: 'text-smash-purple', bg: 'bg-smash-purple/10' },
    { icon: Wallet, title: 'Instant Withdrawals', desc: 'Withdraw your earnings to Airtel Money or TNM Mpamba any time you want.', color: 'text-smash-green', bg: 'bg-smash-green/10' },
    { icon: Tag, title: 'Set Your Price', desc: 'Sell your songs at any price. Fans buy directly — no middleman.', color: 'text-smash-orange', bg: 'bg-smash-orange/10' },
    { icon: Disc, title: 'Album Management', desc: 'Create albums, organise tracks, manage your catalogue professionally.', color: 'text-smash-purple', bg: 'bg-smash-purple/10' },
    { icon: Heart, title: 'Fan Donations', desc: 'Receive donations from fans who love your music. 90% goes straight to you.', color: 'text-smash-orange', bg: 'bg-smash-orange/10' },
  ];

  const steps = [
    { step: 1, title: 'Apply', desc: 'Create your artist account with your details and phone number.' },
    { step: 2, title: 'Subscribe', desc: 'Choose a plan that fits your needs — from Rising Star to Elite.' },
    { step: 3, title: 'Upload', desc: 'Upload your music with cover art, set your sale price and go live.' },
    { step: 4, title: 'Earn', desc: 'Fans stream, buy and donate. Withdraw to your mobile money wallet.' },
  ];

  const plans = [
    {
      name: 'Free Studio',
      price: '0',
      period: 'yr',
      features: ['5 Total Uploads', '15% fee on tips/sales', 'Basic Analytics', 'MK 50K max withdrawal/mo'],
      color: 'gray'
    },
    {
      name: '🌟 Rising Star',
      price: '15,000',
      period: 'yr',
      features: ['30 Uploads/month', '10% fee on tips/sales', 'Messaging & Subscriptions', 'MK 200K max withdrawal/mo'],
      color: 'blue'
    },
    {
      name: '🚀 Standard',
      price: '25,000',
      period: 'yr',
      featured: true,
      features: ['Unlimited uploads', '7% fee on tips/sales', 'Advanced Analytics', 'Verified Badge & Custom URL'],
      color: 'orange'
    },
    {
      name: '👑 Elite / Label',
      price: '45,000',
      period: 'yr',
      features: ['Manage up to 10 Profiles', '5% fee on tips/sales', 'Full Label Analytics', 'Unlimited Withdrawals'],
      color: 'purple'
    }
  ];

  return (
    <div className="min-h-screen bg-smash-black text-white font-sans selection:bg-smash-orange selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-6 bg-smash-black/10 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
          <Logo size="md" />
          <div className="hidden sm:block">
            <p className="text-[10px] font-black text-smash-purple uppercase tracking-[0.3em] leading-none mb-1">Artist Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/auth/artist')} className="hidden md:block text-xs font-black text-smash-gray hover:text-white uppercase tracking-widest transition-colors">Log In</button>
          <button 
            onClick={() => navigate(role === 'artist' ? '/artist-hub' : role === 'pending' ? '/application-pending' : '/auth/artist?mode=signup')} 
            className="px-8 py-3 bg-smash-purple text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-smash-purple transition-all shadow-lg active:scale-95"
          >
            {role === 'artist' ? 'Open Studio' : role === 'pending' ? 'Application Pending' : 'Apply Now'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.1),transparent_70%)] pointer-events-none animate-[custom-breathe_6s_infinite]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-[10px] bg-smash-purple/10 border border-smash-purple/20 text-xs font-display font-semibold text-smash-purple mb-8 tracking-widest uppercase">
            <Star size={14} fill="currentColor" /> #1 Artist Platform in Malawi
          </div>
          
          <h1 className="text-[clamp(2.5rem,8vw,7rem)] font-bold font-studio leading-[0.9] -tracking-[0.03em] mb-8 uppercase">
            YOUR MUSIC.<br/><span className="text-smash-purple">YOUR MONEY.</span>
          </h1>
          
          <p className="text-[16px] md:text-[20px] text-text-secondary max-w-2xl mx-auto mb-12 font-sans font-medium line-height-[1.6]">
            Upload, distribute and monetise your music directly to thousands of listeners. Keep 100% of your rights and 90% of every sale.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-20">
            <button 
              onClick={() => navigate(role === 'artist' ? '/artist-hub' : role === 'pending' ? '/application-pending' : '/auth/artist?mode=signup')}
              className="h-[44px] px-6 bg-smash-orange text-white rounded-[10px] font-display font-semibold text-xs uppercase tracking-widest hover:bg-smash-orange/90 transition-colors shadow-none"
            >
              {role === 'artist' ? 'Go to Studio' : role === 'pending' ? 'Review Application' : 'Start as an Artist'}
            </button>
            <button 
              onClick={() => navigate(role === 'artist' ? '/artist-hub' : '/auth/artist')}
              className="h-[44px] px-6 bg-transparent border border-border-default text-text-primary rounded-[10px] font-display font-semibold text-xs uppercase tracking-widest hover:border-smash-purple hover:text-smash-purple transition-colors shadow-none"
            >
              {role === 'artist' ? 'Manage Music' : 'Artist Login'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <CountUpStat to={90} suffix="%" label="Artist Payout" />
            <CountUpStat to={500} suffix="+" label="Songs Live" />
            <CountUpStat to={10} suffix="K+" label="Listeners" />
            <CountUpStat label="Withdrawals" textValue="Instant" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 md:px-12 bg-bg-surface border-y border-border-subtle">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-[11px] font-display font-medium text-smash-purple uppercase tracking-widest mb-4">Platform Features</h2>
            <h3 className="text-3xl md:text-5xl font-studio font-bold -tracking-[0.02em]">Everything an Artist Needs</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-bg-surface border border-border-subtle rounded-[14px] p-8 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-[10px] ${f.bg} flex items-center justify-center ${f.color} mb-6`}>
                  <f.icon size={24} />
                </div>
                <h3 className="text-[18px] font-studio font-bold mb-3 text-text-primary">{f.title}</h3>
                <p className="text-[14px] font-sans text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-[11px] font-display font-medium text-smash-purple uppercase tracking-widest mb-4">How it works</h2>
            <h3 className="text-3xl md:text-5xl font-studio font-bold -tracking-[0.02em]">Start earning in 4 Steps</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute top-[28px] left-[15%] right-[15%] h-px bg-border-subtle z-0" />
            
            {steps.map((s, i) => (
              <div key={i} className="text-center relative z-10 bg-bg-page pt-2">
                <div className="w-14 h-14 bg-bg-surface border border-border-default rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-lg font-studio font-bold text-smash-purple">
                  {s.step}
                </div>
                <h4 className="text-[16px] font-studio font-bold uppercase mb-2 text-text-primary">{s.title}</h4>
                <p className="text-[14px] text-text-secondary font-sans leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Plans */}
      <section className="py-32 px-6 md:px-12 bg-bg-surface border-y border-border-subtle">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[11px] font-display font-medium text-smash-purple uppercase tracking-widest mb-4">Artist Plans</h2>
            <h3 className="text-3xl md:text-5xl font-studio font-bold -tracking-[0.02em]">Choose Your Level</h3>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8 md:pb-0 hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
            {plans.map((p, i) => (
              <div key={i} className={`min-w-[280px] snap-start bg-bg-surface p-6 rounded-[14px] flex flex-col border ${p.featured ? 'border-smash-orange border-2' : 'border-border-subtle'}`}>
                <div className="flex justify-between items-start mb-6">
                   <h4 className="text-[18px] font-studio font-bold text-text-primary">{p.name}</h4>
                   {p.featured && (
                     <div className="bg-smash-orange/10 text-smash-orange text-[10px] font-display font-semibold px-2 py-1 rounded-[6px] uppercase tracking-wider">
                       Most Popular
                     </div>
                   )}
                </div>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-[32px] font-studio font-bold text-text-primary">{p.price}</span>
                  <span className="text-[11px] uppercase font-display font-medium text-text-muted">MK / yr</span>
                </div>
                <ul className="space-y-4 mb-12 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-[13px] font-sans text-text-secondary">
                      <CheckCircle2 size={16} className={`${p.featured ? 'text-smash-orange' : 'text-smash-purple'} shrink-0`} /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => navigate(role === 'artist' ? '/artist-hub' : role === 'pending' ? '/application-pending' : '/auth/artist?mode=signup')}
                  className={`w-full h-[44px] rounded-[10px] font-display font-semibold text-[12px] uppercase tracking-widest transition-colors flex items-center justify-center ${
                    p.featured ? 'bg-smash-orange text-white hover:bg-smash-orange/90' : 'bg-transparent border border-border-default text-text-primary hover:border-smash-purple hover:text-smash-purple'
                  }`}
                >
                  {role === 'artist' ? 'Switch Plan' : role === 'pending' ? 'Review App' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-smash-purple/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <Rocket className="mx-auto text-smash-purple mb-8" size={64} />
          <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-studio font-bold uppercase tracking-tight mb-6 leading-[1.1]">Ready to Start Earning?</h2>
          <p className="text-[16px] md:text-[20px] text-text-secondary mb-10 font-sans leading-relaxed">Join hundreds of Malawian artists already monetising their music. Keep control, keep your rights, keep 90%.</p>
          <button 
            onClick={() => navigate('/auth/artist?mode=signup')}
            className="h-[44px] px-8 bg-smash-purple text-white rounded-[10px] font-display font-semibold text-[13px] uppercase tracking-widest hover:bg-smash-purple/90 transition-colors shadow-none"
          >
            Apply as Artist Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-smash-gray">
        <p className="font-bold mb-4">© {new Date().getFullYear()} Smashify Artists. Built in Blantyre, Malawi.</p>
        <div className="flex justify-center gap-8 text-[10px] font-black uppercase tracking-widest">
           <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button>
           <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button>
           <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Support</button>
        </div>
      </footer>
    </div>
  );
};

export default ArtistLanding;
