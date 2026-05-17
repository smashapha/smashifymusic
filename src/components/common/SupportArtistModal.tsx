import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Heart, ShieldCheck, ChevronRight, Zap, Coffee, Crown } from 'lucide-react';
import Avatar from './Avatar';
import { UserProfile } from '../../types';
import { sendTip } from '../../lib/paychangu';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface SupportArtistModalProps {
  artist: UserProfile;
  onClose: () => void;
}

const SupportArtistModal: React.FC<SupportArtistModalProps> = ({ artist, onClose }) => {
  const { userProfile } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const presetAmounts = [
    { value: '1000', label: 'Coffee', icon: <Coffee size={16} /> },
    { value: '5000', label: 'Vibe Check', icon: <Zap size={16} /> },
    { value: '10000', label: 'Superfan', icon: <Heart size={16} /> },
    { value: '25000', label: 'Patron', icon: <Crown size={16} /> },
  ];

  const handleSupport = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 500) {
      toast.error('Minimum support is MK 500');
      return;
    }

    if (!userProfile) {
      toast.error('Please sign in to support this artist');
      return;
    }

    setLoading(true);
    try {
      await sendTip({
        artist,
        fan: userProfile,
        amount: Number(amount),
        anonymous: false
      });
      // sendTip redirects to PayChangu checkout
      // If we reach here without redirect, it failed silently
    } catch (err: any) {
      console.error('sendTip error:', err);
      toast.error('Payment failed: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-smash-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="max-w-md w-full bg-smash-dark border border-white/10 rounded-[48px] overflow-hidden shadow-[0_0_50px_rgba(155,93,229,0.2)]"
      >
        <div className="p-8 md:p-12 space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-smash-purple">
                    <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full" />
                 </div>
                 <div>
                    <h3 className="font-black uppercase tracking-tight text-white leading-none">Support Artist</h3>
                    <p className="text-[10px] font-black text-smash-purple uppercase tracking-widest mt-1">{artist.stage_name || artist.full_name}</p>
                 </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                 <X size={20} />
              </button>
           </div>

           <div className="text-center space-y-4">
              <Heart className="mx-auto text-smash-purple" size={48} fill="currentColor" />
              <h2 className="text-3xl font-black font-studio italic uppercase tracking-tighter leading-none">FUEL THE <span className="text-smash-purple">CREATIVE</span></h2>
              <p className="text-smash-gray font-bold text-sm">Your tips go directly to the artist. Help them keep the studio lights on and the hits coming.</p>
           </div>

           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 {presetAmounts.map((preset) => (
                    <button 
                      key={preset.value}
                      onClick={() => setAmount(preset.value)}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                        amount === preset.value ? 'bg-smash-purple border-smash-purple text-white' : 'bg-white/5 border-white/10 hover:border-smash-purple/30 text-smash-gray hover:text-white'
                      }`}
                    >
                       <span className="text-xs font-black uppercase tracking-widest">{preset.label}</span>
                       <div className="flex items-center gap-2">
                          {preset.icon}
                          <span className="font-studio font-black text-xs italic">MK {Number(preset.value).toLocaleString()}</span>
                       </div>
                    </button>
                 ))}
              </div>

              <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-smash-purple font-black">MK</div>
                 <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter Custom Amount"
                    min="500"
                    className="w-full bg-white/5 border border-white/10 rounded-[28px] pl-16 pr-8 py-5 text-xl font-studio font-black italic outline-none focus:border-smash-purple transition-all"
                 />
              </div>

              <div className="p-6 bg-white/5 border border-white/5 rounded-[24px] space-y-3">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-smash-gray">
                    <span>Artist Receives (100%)</span>
                    <span className="text-white">MK {(Number(amount) || 0).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-smash-gray">
                    <span>Platform Fee</span>
                    <span className="text-smash-green">Applied at withdrawal</span>
                 </div>
              </div>

              <button 
                onClick={handleSupport}
                disabled={loading || !amount}
                className="w-full py-6 bg-smash-purple text-white rounded-[32px] font-black text-2xl uppercase tracking-widest shadow-2xl shadow-smash-purple/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 italic"
              >
                 {loading ? 'Processing...' : `Send MK ${(Number(amount) || 0).toLocaleString()}`}
                 <ChevronRight size={24} />
              </button>
           </div>

           <div className="flex items-center justify-center gap-2 text-smash-gray">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Secured by PayChangu</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SupportArtistModal;
