import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronRight, Calculator, Wallet, Coins, ArrowRight, MessageCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { upgradeListenerPlan, upgradeArtistTier } from '../lib/paychangu';
import toast from 'react-hot-toast';

const PricingCard = ({ title, price, features, badge, isArtist = false, onAction, subtitle, period = 'mo' }: any) => (
  <div className={`bento-card p-10 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all ${badge ? 'ring-2 ring-smash-orange bg-smash-dark/50' : 'bg-white/5 border-white/5'}`}>
    {badge && (
      <div className="absolute top-6 right-0 bg-smash-orange text-white text-[10px] font-black px-4 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg z-10">
        {badge}
      </div>
    )}
    <h3 className="text-2xl font-black font-display italic uppercase mb-1">{title}</h3>
    {subtitle && <p className="text-smash-gray text-xs mb-4 font-bold h-4">{subtitle}</p>}
    <div className="flex items-baseline gap-2 mb-8">
      <span className="text-sm font-black text-smash-gray uppercase tracking-widest">MK</span>
      <span className="text-5xl font-black font-display italic">{price}</span>
      <span className="text-sm font-black text-smash-gray uppercase tracking-widest">/{period}</span>
    </div>
    <ul className="space-y-4 mb-10 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-3 text-smash-gray font-bold group-hover:text-white transition-colors text-sm">
          <Check size={18} className="text-smash-orange flex-shrink-0 mt-0.5" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onAction}
      className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all ${badge ? 'bg-smash-orange text-white hover:bg-smash-orange/80 shadow-xl' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white shadow-xl'}`}
    >
      {price === '0' ? 'Start Free' : (isArtist ? 'Upgrade Now' : 'Get Plan')}
    </button>
  </div>
);

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'listeners' | 'artists'>((searchParams.get('tab') as 'listeners' | 'artists') || 'listeners');
  const [expectedTips, setExpectedTips] = useState<number>(50000);

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
      navigate(activeTab === 'artists' ? '/auth/artist' : '/auth/listener');
      return;
    }
    if (!planId) {
       navigate(activeTab === 'artists' ? '/artist-hub' : '/');
       return;
    }
    if (activeTab === 'artists') {
      upgradeArtistTier({
        tier: planId as any,
        artist: userProfile
      });
    } else {
      upgradeListenerPlan({
        plan: planId as any,
        user: userProfile
      });
    }
  };

  const calculateKeep = (tier: string) => {
    let fee = 0.15;
    if (tier === 'Rising Star') fee = 0.10;
    if (tier === 'Standard') fee = 0.07;
    if (tier === 'Elite') fee = 0.05;
    return expectedTips - (expectedTips * fee);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 md:p-12 pb-32 max-w-[1400px] mx-auto"
    >
      <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-12">
         <Link to="/" className="hover:text-white transition-colors">Home</Link>
         <ChevronRight size={14} />
         <span className="text-smash-orange">Pricing Plans</span>
      </div>

      <div className="text-center mb-16">
         {activeTab === 'artists' ? (
            <>
              <h1 className="text-5xl md:text-7xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">
                We only make money<br/>when <span className="text-smash-orange">you make money</span>
              </h1>
              <p className="text-smash-gray text-xl font-medium tracking-tight mt-4">Invest in your music. Every tier pays for itself.</p>
            </>
         ) : (
            <>
              <h1 className="text-5xl md:text-7xl font-black font-display italic uppercase tracking-tighter mb-4 leading-none">
                MALAWI'S <span className="text-smash-orange">BEST MUSIC</span>
              </h1>
              <p className="text-smash-gray text-xl font-medium tracking-tight mt-4">Support your favorite artists directly.</p>
            </>
         )}
      </div>

      <div className="flex justify-center mb-16">
        <div className="flex p-2 bg-smash-dark rounded-3xl border border-white/5 shadow-2xl">
          <button 
            onClick={() => handleTabChange('listeners')} 
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'listeners' ? 'bg-white text-smash-black shadow-lg' : 'text-smash-gray hover:text-white'}`}
          >
            Listener Plans
          </button>
          <button 
            onClick={() => handleTabChange('artists')} 
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'artists' ? 'bg-white text-smash-black shadow-lg' : 'text-smash-gray hover:text-white'}`}
          >
            Artist Plans
          </button>
        </div>
      </div>

      {activeTab === 'listeners' && (
         <motion.div 
          key="listeners"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
             <PricingCard 
                title="Free" 
                price="0" 
                onAction={() => handleAction()}
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
                onAction={() => handleAction('Premium')}
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
                onAction={() => handleAction('Family')}
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
          <p className="text-center text-smash-gray font-bold text-sm uppercase tracking-widest">
            Cancel anytime. Billed monthly via Airtel/TNM.
          </p>
        </motion.div>
      )}

      {activeTab === 'artists' && (
        <motion.div 
          key="artists"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
             <PricingCard 
                isArtist={true}
                title="Free Studio" 
                price="0" 
                period="yr"
                subtitle="For beginners"
                onAction={() => handleAction()}
                features={[
                  "5 Total Uploads (500MB)", 
                  "15% Platform fee on tips/sales", 
                  "20% Platform fee on subs",
                  "Basic Analytics",
                  "MK 50K max withdrawal/mo",
                  "7 day payout speed"
                ]} 
             />
             <PricingCard 
                isArtist={true}
                title="Rising Star" 
                price="15,000" 
                period="yr"
                subtitle="Build your fanbase"
                onAction={() => handleAction('RisingStar')}
                features={[
                  "30 Uploads/month (5GB)", 
                  "10% Platform fee on tips/sales",
                  "15% Platform fee on subs",
                  "Standard Analytics + Demographics",
                  "Fan messaging & Subscriptions",
                  "MK 200K max withdrawal/mo (3 days)"
                ]} 
             />
             <PricingCard 
                isArtist={true}
                title="Standard" 
                price="25,000" 
                period="yr"
                badge="MOST POPULAR" 
                subtitle="For full-time artists"
                onAction={() => handleAction('Standard')}
                features={[
                  "Unlimited Uploads (20GB)", 
                  "7% Platform fee on tips/sales",
                  "10% Platform fee on subs",
                  "Advanced Analytics + Revenue Forecast",
                  "1 Free featured placement/mo",
                  "MK 500K max withdrawal/mo (24h)",
                  "Verified Badge & Custom URL"
                ]} 
             />
             <PricingCard 
                isArtist={true}
                title="Elite / Label" 
                price="45,000" 
                period="yr"
                subtitle="For Serious Artists & Labels"
                onAction={() => handleAction('Elite')}
                features={[
                  "Manage up to 10 Profiles", 
                  "5% Platform fee on tips/sales",
                  "8% Platform fee on subs",
                  "Full Label Analytics Export",
                  "Unlimited Withdrawals (Instant)",
                  "Gold Verified Badge",
                  "Dedicated Support & API Access"
                ]} 
             />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-10 mb-20">
            <h3 className="text-3xl font-black font-display italic uppercase mb-8 flex items-center gap-4">
              <Calculator className="text-smash-orange" size={32} />
              Calculate your ROI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <label className="block text-sm font-bold text-smash-gray uppercase tracking-widest mb-4">
                  If your fans send you tips & sales worth:
                </label>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-2xl font-black">MK</span>
                  <input 
                    type="range" 
                    min="10000" 
                    max="1000000" 
                    step="10000"
                    value={expectedTips}
                    onChange={(e) => setExpectedTips(Number(e.target.value))}
                    className="flex-1 accent-smash-orange"
                  />
                  <span className="text-2xl font-black">{expectedTips.toLocaleString()}</span>
                </div>
                <p className="text-sm text-smash-gray">
                  Adjust the slider to see how much you keep on each tier.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-smash-gray">On Free (Keep 85%):</span>
                  <span className="text-lg font-black">MK {calculateKeep('Free').toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-smash-gray">On Rising Star (Keep 90%):</span>
                  <span className="text-lg font-black">MK {calculateKeep('Rising Star').toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-smash-orange/20 rounded-xl border border-smash-orange/50">
                  <span className="font-bold text-smash-orange">On Standard (Keep 93%):</span>
                  <span className="text-lg font-black text-white">MK {calculateKeep('Standard').toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shared Bottom Section */}
      <div className="mb-24">
        <h3 className="text-4xl font-black font-display italic uppercase text-center mb-16">How Payouts Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: <Coins size={32} />, title: "Fan Pays", desc: "Fans tip or buy exactly what they want to pay for." },
            { icon: <Calculator size={32} />, title: "Auto-Split", desc: "Transactions process immediately and our tiny fee is deducted." },
            { icon: <Wallet size={32} />, title: "Added to Wallet", desc: "Your Smashify wallet updates instantly with your earnings." },
            { icon: <ArrowRight size={32} />, title: "Withdraw to Phone", desc: "Cash out directly to Airtel Money or TNM Mpamba." }
          ].map((step, i) => (
            <div key={i} className="text-center p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-smash-orange/50 transition-colors">
              <div className="w-16 h-16 rounded-full bg-smash-orange/20 text-smash-orange flex items-center justify-center mx-auto mb-6">
                {step.icon}
              </div>
              <h4 className="text-xl font-black uppercase tracking-widest mb-2">{step.title}</h4>
              <p className="text-smash-gray text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto mb-20">
        <h3 className="text-4xl font-black font-display italic uppercase text-center mb-12">FAQ</h3>
        <div className="space-y-4">
          {[
            { q: "How do I get paid?", a: "When your wallet reaches the minimum withdrawal amount for your tier, you can cash out directly to your registered Airtel Money or TNM Mpamba number." },
            { q: "Are there hidden fees?", a: "No. PayChangu charges a standard ~1.5% processing fee, and we take our platform cut (which depends on your tier). The rest is 100% yours." },
            { q: "Can I upgrade or downgrade anytime?", a: "Yes. All subscriptions are billed yearly. You can switch tiers at any time and it will apply to your next billing cycle." },
            { q: "Do listeners have to pay to hear my music?", a: "No, listeners on the Free plan can hear your music with ads. However, they can tip you directly. Only music you explicitly set a price for requires purchase." }
          ].map((faq, i) => (
            <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="font-black text-lg mb-2">{faq.q}</h4>
              <p className="text-smash-gray leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <a href="https://wa.me/265990000000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-full font-black uppercase tracking-widest hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20">
          <MessageCircle size={24} />
          Still unsure? Chat on WhatsApp
        </a>
      </div>

    </motion.div>
  );
};

export default Pricing;
