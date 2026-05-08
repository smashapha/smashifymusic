import React from 'react';
import { motion } from 'motion/react';
import { 
  Mic2, Music2, Wallet, BarChart3, Tag, Disc, 
  Heart, Rocket, Star, CheckCircle2, ChevronRight,
  ShieldCheck, Globe, Zap, Headphones
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';

const ArtistLanding: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const features = [
    { icon: Music2, title: 'Easy Upload', desc: 'Upload single songs or full albums. Cover art, lyrics, price — all in one place.' },
    { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track plays, followers, revenue by song and by month. Know what\'s working.' },
    { icon: Wallet, title: 'Instant Withdrawals', desc: 'Withdraw your earnings to Airtel Money or TNM Mpamba any time you want.' },
    { icon: Tag, title: 'Set Your Price', desc: 'Sell your songs at any price. Fans buy directly — no middleman.' },
    { icon: Disc, title: 'Album Management', desc: 'Create albums, organise tracks, manage your catalogue professionally.' },
    { icon: Heart, title: 'Fan Donations', desc: 'Receive donations from fans who love your music. 90% goes straight to you.' },
  ];

  const steps = [
    { step: 1, title: 'Apply', desc: 'Create your artist account with your details and phone number.' },
    { step: 2, title: 'Subscribe', desc: 'Choose a plan that fits your needs — from Rising Star to Elite.' },
    { step: 3, title: 'Upload', desc: 'Upload your music with cover art, set your sale price and go live.' },
    { step: 4, title: 'Earn', desc: 'Fans stream, buy and donate. Withdraw to your mobile money wallet.' },
  ];

  const plans = [
    {
      name: '🌟 Rising Star',
      price: '15,000',
      period: 'year',
      features: ['Upload up to 10 songs/month', 'Basic analytics', 'Airtel/TNM withdrawals', 'Artist profile page'],
      color: 'blue'
    },
    {
      name: '🚀 Standard',
      price: '25,000',
      period: 'year',
      featured: true,
      features: ['Unlimited uploads', 'Full analytics dashboard', 'Priority support', 'Featured placement', 'Album creation'],
      color: 'orange'
    },
    {
      name: '👑 Elite / Label',
      price: '45,000',
      period: 'year',
      features: ['Everything in Standard', 'Multiple artist management', 'Label branding', 'Dedicated account manager', 'Early feature access'],
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.1),transparent_70%)] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-smash-purple/10 border border-smash-purple/20 text-xs font-black text-smash-purple mb-8 tracking-widest uppercase italic font-studio">
            <Star size={14} fill="currentColor" /> #1 Artist Platform in Malawi
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black font-studio leading-[0.9] tracking-tighter mb-8 uppercase italic">
            YOUR MUSIC.<br/><span className="text-smash-purple">YOUR MONEY.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-smash-gray max-w-2xl mx-auto mb-12 font-semibold">
            Upload, distribute and monetise your music directly to thousands of listeners. Keep 100% of your rights and 90% of every sale.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-20">
            <button 
              onClick={() => navigate(role === 'artist' ? '/artist-hub' : role === 'pending' ? '/application-pending' : '/auth/artist?mode=signup')}
              className="px-10 py-5 bg-white text-smash-black rounded-full font-black text-sm md:text-lg uppercase tracking-widest hover:bg-smash-purple hover:text-white transition-all transform hover:scale-105 shadow-2xl active:scale-95"
            >
              {role === 'artist' ? 'Go to Studio' : role === 'pending' ? 'Review Application' : 'Start as an Artist'} <Mic2 size={24} className="inline ml-2" />
            </button>
            <button 
              onClick={() => navigate(role === 'artist' ? '/artist-hub' : '/auth/artist')}
              className="px-10 py-5 bg-white/5 border border-white/10 rounded-full font-black text-sm md:text-lg uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {role === 'artist' ? 'Manage Music' : 'Artist Login'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { n: '90%', l: 'Artist Payout' },
              { n: '500+', l: 'Songs Live' },
              { n: '10K+', l: 'Listeners' },
              { n: 'Instant', l: 'Withdrawals' }
            ].map((s, i) => (
              <div key={i}>
                <p className="text-3xl md:text-5xl font-black font-studio italic text-smash-purple mb-1 text-shadow-purple">{s.n}</p>
                <p className="text-[10px] font-black text-smash-gray uppercase tracking-[0.2em]">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 md:px-12 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-xs font-black text-smash-purple uppercase tracking-[.4em] mb-4">Platform Features</h2>
            <h3 className="text-4xl md:text-7xl font-black font-studio italic uppercase tracking-tighter">Everything an Artist Needs</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bento-card bg-smash-dark/50 border-white/5 p-10 hover:border-smash-purple/30 transition-all group">
                <div className="w-16 h-16 rounded-2xl bg-smash-purple/10 flex items-center justify-center text-smash-purple mb-8 group-hover:scale-110 transition-transform">
                  <f.icon size={32} />
                </div>
                <h3 className="text-2xl font-black font-studio italic uppercase mb-4">{f.title}</h3>
                <p className="text-smash-gray font-semibold leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-xs font-black text-smash-purple uppercase tracking-[.4em] mb-4 font-studio">How it works</h2>
            <h3 className="text-4xl md:text-7xl font-black font-studio italic uppercase tracking-tighter">Start earning in 4 Steps</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center relative">
                <div className="w-20 h-20 bg-gradient-to-br from-smash-purple to-purple-800 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl text-4xl font-black font-studio italic">
                  {s.step}
                </div>
                <h4 className="text-xl font-black font-studio italic uppercase mb-3">{s.title}</h4>
                <p className="text-smash-gray font-bold text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Plans */}
      <section className="py-32 px-6 md:px-12 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-xs font-black text-smash-purple uppercase tracking-[.4em] mb-4">Artist Plans</h2>
            <h3 className="text-4xl md:text-7xl font-black font-studio italic uppercase tracking-tighter">Choose Your Level</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((p, i) => (
              <div key={i} className={`bento-card p-12 bg-smash-dark/50 border-white/5 relative overflow-hidden flex flex-col ${p.featured ? 'ring-2 ring-smash-purple shadow-2xl shadow-smash-purple/10' : ''}`}>
                {p.featured && (
                  <div className="absolute top-6 right-0 bg-smash-purple text-white text-[10px] font-black px-6 py-2 rounded-l-full uppercase tracking-widest shadow-lg">
                    Most Popular
                  </div>
                )}
                <h4 className="text-2xl font-black font-studio italic uppercase mb-2">{p.name}</h4>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-5xl font-black font-studio italic">{p.price}</span>
                  <span className="text-sm rounded uppercase font-black text-smash-gray tracking-widest">MK / Year</span>
                </div>
                <ul className="space-y-4 mb-12 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm font-bold text-smash-gray">
                      <CheckCircle2 size={16} className="text-smash-purple shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => navigate(role === 'artist' ? '/artist-hub' : role === 'pending' ? '/application-pending' : '/auth/artist?mode=signup')}
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    p.featured ? 'bg-smash-purple text-white shadow-lg shadow-smash-purple/20' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {role === 'artist' ? 'Switch Plan' : role === 'pending' ? 'Application Pending' : 'Get Started'}
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
          <Rocket className="mx-auto text-smash-purple mb-10" size={80} />
          <h2 className="text-5xl md:text-8xl font-black font-studio italic uppercase tracking-tighter mb-8 leading-none">Ready to Start Earning?</h2>
          <p className="text-xl md:text-2xl text-smash-gray mb-12 font-semibold">Join hundreds of Malawian artists already monetising their music. Keep control, keep your rights, keep 90%.</p>
          <button 
            onClick={() => navigate('/auth/artist?mode=signup')}
            className="px-16 py-8 bg-smash-purple text-white rounded-[40px] font-black text-2xl uppercase tracking-widest shadow-[0_20px_50px_rgba(124,58,237,0.4)] hover:scale-105 active:scale-95 transition-all font-studio"
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
