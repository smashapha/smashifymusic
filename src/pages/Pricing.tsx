import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronRight } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeListener, subscribeArtist } from '../lib/paychangu';
import toast from 'react-hot-toast';

const PricingCard = ({ title, price, features, badge, isArtist = false, onAction }: any) => (
  <div className={`bento-card p-10 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all ${badge ? 'ring-2 ring-smash-orange bg-smash-dark/50' : 'bg-white/5 border-white/5'}`}>
    {badge && (
      <div className="absolute top-6 right-0 bg-smash-orange text-white text-[10px] font-black px-4 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg z-10">
        {badge}
      </div>
    )}
    <h3 className="text-2xl font-black font-display italic uppercase mb-2">{title}</h3>
    <div className="flex items-baseline gap-2 mb-8">
      <span className="text-sm font-black text-smash-gray uppercase tracking-widest">MK</span>
      <span className="text-5xl font-black font-display italic">{price}</span>
      <span className="text-sm font-black text-smash-gray uppercase tracking-widest">{isArtist ? '/yr' : '/mo'}</span>
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
      className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all ${badge ? 'bg-smash-orange text-white hover:bg-smash-orange/80 shadow-xl' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white shadow-xl'}`}
    >
      GET STARTED
    </button>
  </div>
);

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'listeners' | 'artists'>((searchParams.get('tab') as 'listeners' | 'artists') || 'listeners');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'artists' || tab === 'listeners') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'listeners' | 'artists') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const { user, userProfile, refreshProfile } = useAuth();
  
  const handleAction = (planId?: string) => {
    if (!user) {
      if (activeTab === 'artists') {
        navigate('/auth?mode=artist');
      } else {
        navigate('/auth?mode=listener');
      }
      return;
    }

    if (!planId) {
       // Free plan clicked, just go to dashboard or home
       navigate(activeTab === 'artists' ? '/artist-hub' : '/');
       return;
    }

    if (activeTab === 'artists') {
      subscribeArtist({
        plan: planId as any,
        user: userProfile,
        onSuccess: () => {
          toast.success('Subscription upgraded successfully!');
          refreshProfile();
          navigate('/artist-hub');
        }
      });
    } else {
      subscribeListener({
        plan: planId as any,
        user: userProfile,
        onSuccess: () => {
          toast.success('Subscription upgraded successfully!');
          refreshProfile();
          navigate('/');
        }
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 md:p-12 pb-32 max-w-7xl mx-auto"
    >
      <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-12">
         <Link to="/" className="hover:text-white transition-colors">Home</Link>
         <ChevronRight size={14} />
         <span className="text-smash-orange">Pricing Plans</span>
      </div>

      <div className="text-center mb-16">
         <h1 className="text-5xl md:text-8xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">FAIR <span className="text-smash-orange">PRICING</span></h1>
         <p className="text-smash-gray text-xl md:text-2xl font-medium tracking-tight">Everything starts free. Upgrade when you're ready.</p>
      </div>

      <div className="flex justify-center mb-16">
        <div className="flex p-2 bg-smash-dark rounded-3xl border border-white/5">
          <button 
            onClick={() => handleTabChange('listeners')} 
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'listeners' ? 'bg-white text-smash-black' : 'text-smash-gray hover:text-white'}`}
          >
            For Listeners
          </button>
          <button 
            onClick={() => handleTabChange('artists')} 
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'artists' ? 'bg-white text-smash-black' : 'text-smash-gray hover:text-white'}`}
          >
            For Artists
          </button>
        </div>
      </div>

      {activeTab === 'listeners' && (
         <motion.div 
          key="listeners"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32"
        >
           <PricingCard 
              title="Free Plan" 
              price="0" 
              onAction={() => handleAction()}
              features={["Stream with ads", "Discover via Moto Feed", "Create up to 3 playlists", "Support artists with tips"]} 
           />
           <PricingCard 
              title="Premium" 
              price="750" 
              badge="MOST POPULAR"
              onAction={() => handleAction('premium')}
              features={["Everything in Free", "Ad-free listening", "Offline downloads", "HD audio quality", "Early access to unreleased snippets", "Unlimited playlists"]} 
           />
           <PricingCard 
              title="Family" 
              price="3,500" 
              onAction={() => handleAction('family')}
              features={["Everything in Premium", "Up to 5 separate accounts", "Shared family queue", "Parental controls", "One billing for everyone"]} 
           />
         </motion.div>
      )}

      {activeTab === 'artists' && (
        <motion.div 
          key="artists"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32"
        >
           <PricingCard 
              isArtist={true}
              title="Free Artist" 
              price="0" 
              onAction={() => handleAction()}
              features={["Upload 3 Songs", "Basic Profile", "Accept Fan Donations", "Basic Analytics"]} 
           />
           <PricingCard 
              isArtist={true}
              title="Rising Star" 
              price="15,000" 
              onAction={() => handleAction('rising_star')}
              features={["Upload 10 Songs/yr", "Sell Songs & Snippets", "Earnings Dashboard", "Album Creation"]} 
           />
           <PricingCard 
              isArtist={true}
              title="Standard" 
              price="25,000" 
              badge="RECOMMENDED" 
              onAction={() => handleAction('standard')}
              features={["Unlimited Uploads", "Full Detailed Analytics", "Push Notifications to Fans", "Featured in Moto Feed", "Priority Approval"]} 
           />
           <PricingCard 
              isArtist={true}
              title="Elite/Label" 
              price="45,000" 
              onAction={() => handleAction('elite')}
              features={["Manage Multiple Artists", "Label Branding", "Dedicated Manager", "Verified Badge", "Custom Profile URL"]} 
           />
        </motion.div>
      )}

      {/* Why Smashify Wins Table */}
      {activeTab === 'listeners' && (
        <div className="hidden md:block bento-card bg-white/5 border-white/5 overflow-hidden max-w-5xl mx-auto">
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
      )}
    </motion.div>
  );
};

export default Pricing;
