import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronRight, Calculator, Wallet, Coins, ArrowRight, MessageCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { upgradeListenerPlan, upgradeArtistTier } from '../lib/paychangu';
import toast from 'react-hot-toast';

const PricingCard = ({ title, price, features, badge, isArtist = false, onAction, subtitle, period = 'mo' }: any) => (
  <div className={`bento-card p-6 md:p-10 flex flex-col relative overflow-hidden group hover:border-smash-orange/30 transition-all ${badge ? 'ring-2 ring-smash-orange bg-smash-dark/50' : 'bg-white/5 border-white/5'}`}>
    {badge && (
      <div className="absolute top-4 md:top-6 right-0 bg-smash-orange text-white text-[9px] md:text-[10px] font-black px-3 md:px-4 py-1.5 rounded-l-full uppercase tracking-widest shadow-lg z-10">
        {badge}
      </div>
    )}
    <h3 className="text-xl md:text-2xl font-black font-display italic uppercase mb-1">{title}</h3>
    {subtitle && <p className="text-smash-gray text-[10px] md:text-xs mb-4 font-bold h-4">{subtitle}</p>}
    <div className="flex items-baseline gap-2 mb-6 md:mb-8">
      <span className="text-[10px] md:text-sm font-black text-smash-gray uppercase tracking-widest">MK</span>
      <span className="text-4xl md:text-5xl font-black font-display italic">{price}</span>
      <span className="text-[10px] md:text-sm font-black text-smash-gray uppercase tracking-widest">/{period}</span>
    </div>
    <ul className="space-y-3 md:space-y-4 mb-4 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-3 text-smash-gray font-bold group-hover:text-white transition-colors text-xs md:text-sm">
          <Check size={16} className="text-smash-orange flex-shrink-0 mt-0.5 md:w-[18px] md:h-[18px]" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onAction}
      className={`w-full py-4 md:py-5 rounded-[20px] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest transition-all ${badge ? 'bg-smash-orange text-white hover:bg-smash-orange/80 shadow-xl mt-auto' : 'bg-white text-smash-black hover:bg-smash-orange hover:text-white shadow-xl mt-auto'}`}
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

    // Build a safe user object sourced from the auth user, not the profile
    const safeUser = {
      id: user.id,
      email: user.email ?? userProfile?.email ?? '',
      full_name: userProfile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? 'User',
      ...userProfile,
    };

    if (activeTab === 'artists') {
      upgradeArtistTier({ tier: planId as any, artist: safeUser });
    } else {
      upgradeListenerPlan({ plan: planId as any, user: safeUser });
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
    <div 
      className="p-4 md:p-12 pb-32 max-w-[1400px] mx-auto overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="flex items-center gap-3 text-[10px] md:text-sm font-bold text-smash-gray uppercase tracking-widest mb-8 md:mb-12">
         <Link to="/" className="hover:text-white transition-colors">Home</Link>
         <ChevronRight size={12} className="md:w-3.5 md:h-3.5" />
         <span className="text-smash-orange">Pricing Plans</span>
      </div>

      <div className="text-center mb-12 md:mb-16">
         {activeTab === 'artists' ? (
            <>
              <h1 className="text-3xl md:text-7xl font-black font-display italic uppercase tracking-tighter mb-4 leading-tight md:leading-none">
                We only make money<br className="hidden md:block"/>when <span className="text-smash-orange">you make money</span>
              </h1>
              <p className="text-smash-gray text-base md:text-xl font-medium tracking-tight mt-4">Invest in your music. Every tier pays for itself.</p>
            </>
         ) : (
            <>
              <h1 className="text-3xl md:text-7xl font-black font-display italic uppercase tracking-tighter mb-4 leading-tight md:leading-none">
                STREAM <span className="text-smash-orange">AFRICA'S BEST</span>
              </h1>
              <p className="text-smash-gray text-base md:text-xl font-medium tracking-tight mt-4">Support your favorite artists directly.</p>
            </>
         )}
      </div>

      <div className="flex justify-center mb-12 md:mb-16">
        <div className="flex p-1.5 md:p-2 bg-smash-dark rounded-full md:rounded-3xl border border-white/5 shadow-2xl w-full max-w-md">
          <button 
            onClick={() => handleTabChange('listeners')} 
            className={`flex-1 px-4 md:px-8 py-3 rounded-full md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'listeners' ? 'bg-white text-smash-black shadow-lg' : 'text-smash-gray hover:text-white'}`}
          >
            Listeners
          </button>
          <button 
            onClick={() => handleTabChange('artists')} 
            className={`flex-1 px-4 md:px-8 py-3 rounded-full md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'artists' ? 'bg-white text-smash-black shadow-lg' : 'text-smash-gray hover:text-white'}`}
          >
            Artists
          </button>
        </div>
      </div>

      {activeTab === 'listeners' && (
         <motion.div 
          key="listeners"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-16 max-w-7xl mx-auto">
             <PricingCard 
                title="Daily Pass" 
                price="150" 
                period="24 HRS"
                onAction={() => handleAction('DailyPass')}
                features={[
                  "Ad-free for 24 hours", 
                  "High quality audio", 
                  "Offline saves (10 songs)",
                  "Unlimited skips",
                  "Cancel anytime"
                ]} 
             />
             <PricingCard 
                title="Weekly Pass" 
                price="700" 
                period="7 DAYS"
                onAction={() => handleAction('WeeklyPass')}
                features={[
                  "Ad-free for 7 days", 
                  "High quality audio", 
                  "Offline saves (30 songs)",
                  "Unlimited skips",
                  "Cancel anytime"
                ]} 
             />
             <PricingCard 
                title="Premium Monthly" 
                price="2,000" 
                badge="POPULAR"
                onAction={() => handleAction('Premium')}
                features={[
                  "Ad-free listening", 
                  "High quality audio", 
                  "Offline saves (50 songs)",
                  "Unlimited skips & downloads",
                  "Lyrics display & stats",
                  "Early access to content"
                ]} 
             />
             <PricingCard 
                title="Family Monthly" 
                price="5,000" 
                onAction={() => handleAction('Family')}
                features={[
                  "5 Premium accounts", 
                  "Ad-free for everyone",
                  "Offline saves for all",
                  "Unlimited downloads",
                  "Individual stats",
                  "One monthly bill"
                ]} 
             />
          </div>
          <p className="text-center text-smash-gray font-bold text-[10px] md:text-sm uppercase tracking-widest">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 md:mb-16">
             <PricingCard 
                isArtist={true}
                title="Free Studio" 
                price="0" 
                subtitle="For beginners"
                onAction={() => handleAction()}
                features={[
                  "5 total uploads (lifetime)",
                  "Streaming only — no track sales or downloads",
                  "15% fee on tips",
                  "Basic play analytics",
                  "MK 50,000 max withdrawal",
                  "7 day payout speed"
                ]} 
             />
             <PricingCard 
                isArtist={true}
                title="Rising Star" 
                price="8,000" 
                period="6 MO"
                subtitle="MK 1,500/mo | MK 15,000 for 12 months"
                onAction={() => handleAction('RisingStar')}
                features={[
                  "10 uploads per 6 months",
                  "Tips & fan subscriptions only (no track sales)",
                  "Accept fan subscriptions",
                  "10% fee on tips & sales",
                  "Fan messaging enabled",
                  "Standard analytics",
                  "MK 200,000 max withdrawal",
                  "3 day payout speed"
                ]} 
             />
             <PricingCard 
                isArtist={true}
                title="Standard" 
                price="16,000" 
                period="6 MO"
                badge="POPULAR" 
                subtitle="MK 3,000/mo | MK 30,000 for 12 months"
                onAction={() => handleAction('Standard')}
                features={[
                  "15 uploads per 6 months",
                  "Tips & fan subscriptions only (no track sales)",
                  "Accept fan subscriptions",
                  "7% fee on tips & sales",
                  "1 free featured placement/month",
                  "Advanced analytics suite",
                  "Verified badge on profile",
                  "MK 500,000 max withdrawal",
                  "24 hour payout speed"
                ]} 
             />
             <PricingCard 
                isArtist={true}
                title="Elite" 
                price="27,000" 
                period="6 MO"
                subtitle="MK 5,000/mo | MK 50,000 for 12 months"
                onAction={() => handleAction('Elite')}
                features={[
                  "25 uploads per 6 months",
                  "Sell tracks to fans — with fan download access",
                  "Elite exclusive: track sales & downloads",
                  "5% fee on tips & sales",
                  "3 free featured placements/month",
                  "Full analytics with CSV export",
                  "Gold verified badge",
                  "Instant payouts",
                  "Unlimited withdrawals"
                ]} 
             />
          </div>
          <p className="text-center text-smash-gray font-bold text-[10px] md:text-sm uppercase tracking-widest mb-16">
            Slot Booster Pack available for Elite users: +MK 1,500/month per +10 extra track slots
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-10 mb-20">
            <h3 className="text-xl md:text-3xl font-black font-display italic uppercase mb-8 flex items-center gap-4">
              <Calculator className="text-smash-orange shrink-0 md:w-8 md:h-8" size={24} />
              Calculate ROI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <label className="block text-[10px] md:text-sm font-bold text-smash-gray uppercase tracking-widest mb-4">
                  Tips & sales worth:
                </label>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xl md:text-2xl font-black">MK</span>
                  <input 
                    type="range" 
                    min="10000" 
                    max="1000000" 
                    step="10000"
                    value={expectedTips}
                    onChange={(e) => setExpectedTips(Number(e.target.value))}
                    className="flex-1 accent-smash-orange"
                  />
                  <span className="text-xl md:text-2xl font-black">{expectedTips.toLocaleString()}</span>
                </div>
                <p className="text-[10px] md:text-sm text-smash-gray">
                  Adjust slider to see earnings.
                </p>
              </div>
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-xs md:text-sm text-smash-gray truncate mr-2">Free (85%):</span>
                  <span className="text-base md:text-lg font-black shrink-0">MK {calculateKeep('Free').toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-xs md:text-sm text-smash-gray truncate mr-2">Rising Star (90%):</span>
                  <span className="text-base md:text-lg font-black shrink-0">MK {calculateKeep('Rising Star').toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-smash-orange/20 rounded-xl border border-smash-orange/50">
                  <span className="font-bold text-xs md:text-sm text-smash-orange truncate mr-2">Standard (93%):</span>
                  <span className="text-base md:text-lg font-black text-white shrink-0">MK {calculateKeep('Standard').toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="font-bold text-xs md:text-sm text-smash-gray truncate mr-2">Elite (95%):</span>
                  <span className="text-base md:text-lg font-black shrink-0">MK {calculateKeep('Elite').toLocaleString()}</span>
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
            { q: "Can I upgrade or downgrade anytime?", a: "Yes. Listener plans are billed monthly. Artist Studio plans are billed every 6 months. You can upgrade at any time — the new plan takes effect immediately." },
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
        <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white rounded-full font-black uppercase tracking-widest hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20">
          <MessageCircle size={24} />
          Still unsure? Chat on WhatsApp
        </a>
      </div>

    </div>
  );
};

export default Pricing;
