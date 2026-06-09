import React from 'react';
import { BookOpen, DollarSign, ShieldAlert, Sparkles, TrendingUp, Music, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const GuideSection = ({ idx, icon: Icon, title, children, isWarning = false }: any) => (
  <div className={`p-6 sm:p-8 rounded-[16px] border ${isWarning ? 'bg-red-500/5 border-red-500/20' : 'bg-bg-surface border-border-default'}`}>
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-xl shrink-0 ${isWarning ? 'bg-red-500/10 text-red-400' : 'bg-smash-purple/10 text-smash-purple'}`}>
        <Icon size={24} />
      </div>
      <div>
        <h2 className="text-xl font-studio font-bold text-white mb-4">
          <span className={isWarning ? 'text-red-400 opacity-50 mr-2' : 'text-smash-purple opacity-50 mr-2'}>0{idx}</span>
          {title}
        </h2>
        <div className={`text-[14px] leading-relaxed space-y-4 ${isWarning ? 'text-red-400/90 font-medium' : 'text-text-secondary font-sans'}`}>
          {children}
        </div>
      </div>
    </div>
  </div>
);

export default function ArtistGuide() {
  const { userProfile } = useAuth();
  
  return (
    <div className="min-h-screen bg-bg-base/95 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-bg-base/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <Link to="/" className="text-xl font-studio font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-smash-purple to-smash-orange">SMASHIFY</span>
            Studio
        </Link>
        <Link to={userProfile ? "/artist" : "/auth"} className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-colors">
          {userProfile ? 'Back to Dashboard' : 'Sign In'}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-16">
        <div className="mb-12 text-center">
           <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-studio font-black text-white leading-tight uppercase relative inline-block">
             Creator <span className="text-transparent bg-clip-text bg-gradient-to-r from-smash-purple to-smash-orange">Guide</span>
             <Sparkles className="absolute -top-6 -right-8 text-smash-orange opacity-50 rotate-12" size={32} />
           </h1>
           <p className="text-lg text-text-secondary mt-6 max-w-2xl mx-auto font-sans">
             Everything you need to know to grow your audience, monetize your music, and succeed on Africa's fastest-growing platform.
           </p>
        </div>

        <div className="space-y-8">
          <GuideSection idx={1} icon={Sparkles} title="Welcome to Smashify Studio">
            <p>
              Smashify is built for African artists. Unlike streaming platforms that pay fractions of a cent per stream, Smashify lets you earn directly from your fans through track sales, tips, and monthly fan subscriptions. You keep the majority of every payment — we only take a small platform fee based on your tier.
            </p>
          </GuideSection>

          <GuideSection idx={2} icon={DollarSign} title="How Your Earnings Work">
            <div className="bg-bg-elevated/50 border border-white/5 p-5 rounded-xl font-mono text-sm space-y-3 mb-6">
              <p>💰 Tips from fans → You earn 85-95% (based on tier)</p>
              <p>🛒 Track sales → You earn 85-95% (based on tier)</p>
              <p>❤️ Fan subscriptions → You earn 85-95% (based on tier)</p>
              <p>🎙️ Studio subscriptions → 100% goes to platform (this pays for hosting)</p>
            </div>
            
            <p className="font-bold text-white uppercase tracking-widest text-xs mt-6 mb-3">Tier fee breakdown:</p>
            <ul className="space-y-2 list-none">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-text-muted" /> Free tier: 15% platform fee on tips & sales</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Rising Star: 10% platform fee</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-smash-purple" /> Standard: 7% platform fee</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-smash-orange" /> Elite: 5% platform fee</li>
            </ul>
          </GuideSection>

          <GuideSection idx={3} icon={Music} title="Your Slot System Explained">
            <p>
              Your tier gives you a number of active track slots. Only songs people are actively listening to consume slots. Songs with 0 plays for 90 days automatically move to Archive Mode — they become free to host and don't count against your limit. You can also manually archive any song at any time from your Music tab to free up a slot immediately. Archived songs are never deleted and fans can still find and play them.
            </p>
          </GuideSection>

          <GuideSection idx={4} icon={TrendingUp} title="How to Maximize Your Earnings">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <ArrowRight className="text-smash-purple mt-1 shrink-0" size={14} /> 
                <span className="text-white font-medium">Upload your best 3-5 tracks first before paying for a tier</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="text-smash-purple mt-1 shrink-0" size={14} /> 
                <span className="text-white font-medium">Price tracks between MK 150-500 for maximum conversion</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="text-smash-purple mt-1 shrink-0" size={14} /> 
                <span className="text-white font-medium">Enable fan subscriptions once you have 50+ followers</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="text-smash-purple mt-1 shrink-0" size={14} /> 
                <span className="text-white font-medium">Use MotoFeed snippets to promote new releases — 15-30 second clips drive the most plays</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="text-smash-purple mt-1 shrink-0" size={14} /> 
                <span className="text-white font-medium">Respond to fan comments to build loyalty</span>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="text-smash-purple mt-1 shrink-0" size={14} /> 
                <span className="text-white font-medium">Keep your profile photo and bio updated — verified profiles get 3x more tips</span>
              </li>
            </ul>
          </GuideSection>

          <GuideSection idx={5} icon={ShieldCheck} title="Your 6-Month Hosting Cycle">
            <p>
              When you subscribe to Rising Star, Standard, or Elite, you're buying 6 months of active hosting. 30 days before your subscription ends, we'll notify you to renew. If you miss the renewal, your top 3 songs stay live automatically and the rest enter a 7-day grace period before being vaulted (hidden but never deleted). Renewing at any time restores everything instantly.
            </p>
          </GuideSection>

          <GuideSection idx={6} icon={DollarSign} title="Payout Rules">
            <ul className="space-y-3 list-disc pl-5 marker:text-smash-purple">
              <li>Minimum withdrawal: <span className="text-white font-medium">MK 2,000</span></li>
              <li>Platform handshake fee on withdrawals: <span className="text-white font-medium">3%</span></li>
              <li>Payouts are manual — you submit a request and admin sends it to your verified mobile money number within 24-48 hours</li>
              <li>Your payout phone number is locked to your verified identity for security — contact support to update it</li>
              <li>Free tier artists must reach <span className="text-white font-medium">MK 5,000</span> before requesting a payout</li>
            </ul>
          </GuideSection>

          <GuideSection idx={7} icon={ShieldAlert} title="What Gets You Banned" isWarning={true}>
            <p className="font-bold mb-4">These actions result in immediate permanent account removal with no refund:</p>
            <ul className="space-y-3 list-disc pl-5">
              <li>Uploading music you do not own the rights to</li>
              <li>Uploading covers without a licence or artist permission</li>
              <li>Fraud: fake plays, fake accounts, or artificial engagement</li>
              <li>Harassment of fans, other artists, or platform staff</li>
              <li>Attempting to bypass the payment system</li>
              <li>Uploading explicit content without the explicit content flag</li>
              <li>Content that promotes violence, hate speech, or illegal activity</li>
            </ul>
          </GuideSection>
        </div>

        <p className="text-xs text-smash-gray text-center mt-12">
          By using Smashify as an artist, you agree to our{' '}
          <Link to="/terms" className="text-smash-purple underline">Terms of Service</Link>.
          Questions? Contact <a href="mailto:legal@smashify.mw" className="text-smash-purple underline">legal@smashify.mw</a>
        </p>
      </div>
    </div>
  );
}
