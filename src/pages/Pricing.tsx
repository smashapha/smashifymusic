import React, { useState, useEffect } from 'react';
import { motion } from "motion/react";
import { Check, ChevronRight, Calculator, Wallet, Coins, ArrowRight, MessageCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { upgradeListenerPlan, upgradeArtistTier } from '../lib/paychangu';
import SEO from '../components/common/SEO';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING } from '../lib/layout';

const PricingCard = ({ 
  title, 
  price, 
  features, 
  badge, 
  isArtist = false, 
  onAction, 
  subtitle, 
  period = 'mo', 
  isCurrentPlan = false 
}: any) => (
  <div className={`bg-[#1A1A1A] border rounded-[16px] p-6 md:p-8 flex flex-col relative overflow-hidden transition-all duration-200 ${
    isCurrentPlan 
      ? 'border-[#00A3FF] ring-1 ring-[#00A3FF] bg-[#00A3FF]/[0.03]' 
      : (badge ? 'border-white/20 hover:border-white/30' : 'border-white/10 hover:border-white/20')
  }`}>
    {isCurrentPlan && (
      <div className="absolute top-4 right-4 bg-[#00A3FF] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
        Current Plan
      </div>
    )}
    {!isCurrentPlan && badge && (
      <div className="absolute top-4 right-4 bg-[#00A3FF] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
        {badge}
      </div>
    )}

    <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
    {subtitle ? (
      <p className="text-[#B0B0B0] text-[12px] mb-4 min-h-[18px]">{subtitle}</p>
    ) : (
      <div className="mb-4 min-h-[18px]" />
    )}

    <div className="flex items-baseline gap-1.5 mb-6">
      <span className="text-[12px] font-bold text-[#737373] uppercase tracking-wider">MK</span>
      <span className="text-3xl md:text-4xl font-extrabold text-white">{price}</span>
      <span className="text-[12px] font-medium text-[#737373]">/{period}</span>
    </div>

    <ul className="space-y-3 mb-8 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-start gap-2.5 text-[#B0B0B0] text-[13px] leading-snug">
          <Check size={16} className={`${isCurrentPlan ? 'text-[#00A3FF]' : 'text-[#00A3FF]'} shrink-0 mt-0.5`} />
          <span>{f}</span>
        </li>
      ))}
    </ul>

    <button 
      onClick={onAction}
      disabled={isCurrentPlan}
      className={`w-full py-3 rounded-[10px] font-semibold text-[13px] transition-all mt-auto ${
        isCurrentPlan 
          ? 'bg-white/5 text-[#737373] cursor-not-allowed border border-white/5' 
          : (badge 
              ? 'bg-[#00A3FF] text-white hover:bg-[#0090e0] shadow-md' 
              : 'bg-white text-[#0A0A0A] hover:bg-white/90 shadow-md')
      }`}
    >
      {isCurrentPlan ? 'Active Plan' : (price === '0' ? 'Start Free' : (isArtist ? 'Upgrade Now' : 'Get Plan'))}
    </button>
  </div>
);

const Pricing = () => {
  const navigate = useNavigate();
  const { user, userProfile, role } = useAuth();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'listeners' | 'artists'>('listeners');
  const [expectedTips, setExpectedTips] = useState<number>(50000);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'artists' || tab === 'listeners') {
      setActiveTab(tab);
    } else if (role === 'artist' || role === 'admin') {
      setActiveTab('artists');
    } else {
      setActiveTab('listeners');
    }
  }, [searchParams, role]);

  const handleTabChange = (tab: 'listeners' | 'artists') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const handleAction = (planId?: string) => {
    if (!user) {
      navigate(activeTab === 'artists' ? '/auth/artist' : '/auth/listener');
      return;
    }
    if (!planId) {
      navigate(activeTab === 'artists' ? '/artist-hub' : '/');
      return;
    }

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
    const TIP_FEE = 0.05;
    return expectedTips - (expectedTips * TIP_FEE);
  };

  return (
    <div className={`pt-6 md:pt-10 ${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} text-white max-w-6xl mx-auto`}>
      <SEO 
        title="Plans & Pricing | Smashify Music" 
        description="Affordable listener plans and premium artist tiers on Smashify Music." 
      />

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px] text-[#B0B0B0] mb-6">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span className="text-[#737373]">/</span>
        <span className="text-white">Pricing Plans</span>
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl md:text-5xl font-studio font-bold text-white tracking-tight">
          {activeTab === 'artists' ? 'Invest in Your Music' : 'Stream Africa’s Best'}
        </h1>
        <p className="text-[14px] md:text-[15px] text-[#B0B0B0] mt-3 leading-relaxed">
          {activeTab === 'artists' 
            ? 'Transparent creator tiers designed to help you monetize and grow directly with your fans.'
            : 'Uninterrupted music, high-definition streaming, and direct artist support.'}
        </p>
      </div>

      {/* Role Tabs */}
      <div className="flex justify-center mb-10">
        <div className="flex p-1 bg-[#1A1A1A] border border-white/10 rounded-[12px] w-full max-w-xs">
          <button 
            onClick={() => handleTabChange('listeners')} 
            className={`flex-1 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${
              activeTab === 'listeners' 
                ? 'bg-white text-[#0A0A0A] shadow-sm' 
                : 'text-[#B0B0B0] hover:text-white'
            }`}
          >
            Listeners
          </button>
          <button 
            onClick={() => handleTabChange('artists')} 
            className={`flex-1 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${
              activeTab === 'artists' 
                ? 'bg-white text-[#0A0A0A] shadow-sm' 
                : 'text-[#B0B0B0] hover:text-white'
            }`}
          >
            Artists
          </button>
        </div>
      </div>

      {/* Listener Plans */}
      {activeTab === 'listeners' && (
        <motion.div 
          key="listeners"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <PricingCard 
              title="Daily Pass" 
              isCurrentPlan={userProfile?.subscription_tier === 'DailyPass'}
              price="150" 
              period="24 hrs"
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
              isCurrentPlan={userProfile?.subscription_tier === 'WeeklyPass'}
              price="700" 
              period="7 days"
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
              isCurrentPlan={userProfile?.subscription_tier === 'Premium'}
              price="2,000" 
              badge="Popular"
              period="month"
              onAction={() => handleAction('Premium')}
              features={[
                "Ad-free listening", 
                "High quality audio", 
                "Offline saves (50 songs)",
                "Unlimited skips & downloads",
                "Lyrics display & stats",
                "Early access to releases"
              ]} 
            />
            <PricingCard 
              title="Family Monthly" 
              isCurrentPlan={userProfile?.subscription_tier === 'Family'}
              price="5,000" 
              period="month"
              onAction={() => handleAction('Family')}
              features={[
                "5 Premium accounts", 
                "Ad-free for everyone",
                "Offline saves for all",
                "Unlimited downloads",
                "Individual stats",
                "One convenient monthly bill"
              ]} 
            />
          </div>
          <p className="text-center text-[#737373] text-[13px] mb-16">
            Cancel anytime. Billed via Airtel Money & TNM Mpamba.
          </p>
        </motion.div>
      )}

      {/* Artist Plans */}
      {activeTab === 'artists' && (
        <motion.div 
          key="artists"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <PricingCard 
              isArtist={true}
              isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'Free'}
              title="Free Studio" 
              price="0" 
              period="lifetime"
              subtitle="For emerging creators"
              onAction={() => handleAction()}
              features={[
                "5 total uploads (lifetime)",
                "Streaming only — no track sales",
                "5% platform fee on tips",
                "Basic play analytics",
                "MK 50,000 max withdrawal",
                "Minimum withdrawal: MK 10,000",
                "7 day payout speed"
              ]} 
            />
            <PricingCard 
              isArtist={true}
              isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'RisingStar'}
              title="Rising Star" 
              price="8,000" 
              period="6 mo"
              subtitle="MK 1,500/mo equivalent"
              onAction={() => handleAction('RisingStar')}
              features={[
                "10 uploads per 6 months",
                "Tips & fan subscriptions",
                "Accept fan subscriptions",
                "5% fee on tips",
                "Fan messaging enabled",
                "Standard analytics",
                "MK 200,000 max withdrawal",
                "3 day payout speed"
              ]} 
            />
            <PricingCard 
              isArtist={true}
              isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'Standard'}
              title="Standard" 
              price="16,000" 
              period="6 mo"
              badge="Popular" 
              subtitle="MK 3,000/mo equivalent"
              onAction={() => handleAction('Standard')}
              features={[
                "15 uploads per 6 months",
                "Tips & fan subscriptions",
                "Accept fan subscriptions",
                "5% fee on tips",
                "1 free featured placement/month",
                "Advanced analytics suite",
                "Verified artist badge",
                "MK 500,000 max withdrawal",
                "24 hour payout speed"
              ]} 
            />
            <PricingCard 
              isArtist={true}
              isCurrentPlan={role === 'artist' && userProfile?.artist_tier === 'Elite'}
              title="Elite" 
              price="27,000" 
              period="6 mo"
              subtitle="MK 5,000/mo equivalent"
              onAction={() => handleAction('Elite')}
              features={[
                "25 uploads per 6 months",
                "Sell tracks with fan downloads",
                "10% + MK 50 per track sale",
                "5% fee on tips",
                "3 free featured placements/month",
                "Full analytics with CSV export",
                "Gold verified badge",
                "Instant payouts & unlimited cap"
              ]} 
            />
          </div>

          <p className="text-center text-[#737373] text-[13px] mb-14">
            Slot Booster Pack available for Elite creators: +MK 1,500/month per +10 extra track slots.
          </p>

          {/* Calculator */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 md:p-8 mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-full bg-[#00A3FF]/10 text-[#00A3FF] flex items-center justify-center">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Earnings Calculator</h3>
                <p className="text-[12px] text-[#B0B0B0]">Estimate your net earnings from tips and fan support</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <label className="block text-[12px] font-semibold text-[#B0B0B0] mb-3">
                  Estimated Fan Tips / Sales
                </label>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-lg font-bold text-[#737373]">MK</span>
                  <input 
                    type="range" 
                    min="10000" 
                    max="1000000" 
                    step="10000"
                    value={expectedTips}
                    onChange={(e) => setExpectedTips(Number(e.target.value))}
                    className="flex-1 accent-[#00A3FF]"
                  />
                  <span className="text-lg font-bold text-white min-w-[100px] text-right">{expectedTips.toLocaleString()}</span>
                </div>
                <p className="text-[12px] text-[#737373]">
                  Slide to preview how much you keep after standard processing.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-[#00A3FF]/10 rounded-[12px] border border-[#00A3FF]/20">
                  <div>
                    <span className="font-semibold text-[13px] text-[#00A3FF] block">You Keep (95%):</span>
                    <span className="text-[11px] text-[#B0B0B0]">Tips are 5% all-in across all tiers</span>
                  </div>
                  <span className="text-base md:text-lg font-bold text-white shrink-0">MK {calculateKeep('any').toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-[12px] border border-white/5">
                  <div>
                    <span className="font-semibold text-[13px] text-[#B0B0B0] block">Platform Fee (5%):</span>
                    <span className="text-[11px] text-[#737373]">Covers payment gateway + infrastructure</span>
                  </div>
                  <span className="text-base font-medium text-[#737373] shrink-0">MK {(expectedTips - calculateKeep('any')).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* How Payouts Work */}
      <div className="mb-16">
        <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8">How Payouts Work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Coins size={20} />, title: "Fan Pays", desc: "Fans tip or subscribe with local mobile money." },
            { icon: <Calculator size={20} />, title: "Auto-Split", desc: "Transactions process immediately and our tiny fee is deducted." },
            { icon: <Wallet size={20} />, title: "Added to Wallet", desc: "Your Smashify creator balance updates instantly." },
            { icon: <ArrowRight size={20} />, title: "Cash Out", desc: "Withdraw anytime directly to Airtel Money or TNM Mpamba." }
          ].map((step, i) => (
            <div key={i} className="p-6 bg-[#1A1A1A] rounded-[16px] border border-white/10 text-center flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-[#00A3FF]/10 text-[#00A3FF] flex items-center justify-center mb-4">
                {step.icon}
              </div>
              <h4 className="text-[15px] font-bold text-white mb-1.5">{step.title}</h4>
              <p className="text-[#B0B0B0] text-[12px] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto mb-16">
        <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
        
        <div className="mb-6 p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px]">
          <h3 className="text-[15px] font-bold text-white mb-3">
            Full Fee Transparency
          </h3>
          <div className="space-y-2.5 text-[13px] text-[#B0B0B0] leading-relaxed">
            <p><strong className="text-white">Tips:</strong> 5% all-in, every tier. You keep 95%.</p>
            <p><strong className="text-white">Track sales (Elite only):</strong> 10% + MK 50 flat fee per sale.</p>
            <p><strong className="text-white">Fan subscriptions:</strong> Our 10% fee is included in the listed price.</p>
            <p><strong className="text-white">Withdrawals:</strong> Smashify takes 0%. Only the mobile money network’s 3% transfer fee applies.</p>
            <p><strong className="text-white">Studio subscriptions:</strong> Fixed and transparent — no surprises at checkout.</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { q: "How do I get paid?", a: "When your wallet reaches the minimum withdrawal amount for your tier, you can cash out directly to your registered Airtel Money or TNM Mpamba number." },
            { q: "Are there hidden fees?", a: "No. Tips have a flat 5% fee for every artist. Track sales (Elite only) have a tiered commission plus a small MK 50 processing fee. Withdrawals: Smashify charges 0%, you only pay the standard mobile money network transfer fee (3%), which goes to Airtel/TNM, not us." },
            { q: "What's the minimum withdrawal amount?", a: "MK 10,000. This ensures efficient processing and keeps payout speeds fast." },
            { q: "Can I upgrade or downgrade anytime?", a: "Yes. Listener plans are billed monthly. Artist Studio plans are billed every 6 months. You can upgrade at any time — the new plan takes effect immediately." },
            { q: "Do listeners have to pay to hear my music?", a: "No, listeners can stream approved music. Fans can also tip you or subscribe for exclusive perks." }
          ].map((faq, i) => (
            <div key={i} className="p-5 bg-[#1A1A1A] rounded-[16px] border border-white/10">
              <h4 className="font-bold text-[14px] text-white mb-1.5">{faq.q}</h4>
              <p className="text-[#B0B0B0] text-[13px] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Support CTA */}
      <div className="text-center">
        <a 
          href="https://wa.me/265883728868" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#25D366] text-white rounded-[12px] font-semibold text-[13px] hover:bg-[#20bd5a] transition-colors shadow-md"
        >
          <MessageCircle size={18} />
          Have questions? Chat on WhatsApp
        </a>
      </div>

    </div>
  );
};

export default Pricing;
