import React, { useState } from 'react';
import { motion } from "motion/react";
import { X, Heart, ShieldCheck, ChevronRight, Zap, Coffee, Trophy } from 'lucide-react';
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
    { value: '25000', label: 'Patron', icon: <Trophy size={16} /> },
  ];

  const handleSupport = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 500) {
      toast.error('Minimum support is MK 500');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="max-w-md w-full bg-[#1A1A1A] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 md:p-8 space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                 <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#8B5CF6]">
                    <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full" />
                 </div>
                 <div>
                    <h3 className="font-bold text-white text-[15px] leading-tight">Support Artist</h3>
                    <p className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider mt-0.5">{artist.stage_name || artist.full_name}</p>
                 </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-[#B0B0B0] hover:text-white hover:bg-white/10 transition-all">
                 <X size={18} />
              </button>
           </div>

           <div className="text-center space-y-2 py-2">
              <Heart className="mx-auto text-[#8B5CF6]" size={36} fill="currentColor" />
              <h2 className="text-2xl font-bold font-studio tracking-tight text-white">Direct Artist Support</h2>
              <p className="text-[#B0B0B0] text-[13px] leading-relaxed">Your tips go directly to the creator to fund new productions, studio sessions, and releases.</p>
           </div>

           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                 {presetAmounts.map((preset) => (
                    <button 
                      key={preset.value}
                      onClick={() => setAmount(preset.value)}
                      className={`p-3.5 rounded-[12px] border transition-all flex items-center justify-between group ${
                        amount === preset.value ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-md' : 'bg-[#0A0A0A] border-white/10 hover:border-[#8B5CF6]/40 text-[#B0B0B0] hover:text-white'
                      }`}
                    >
                       <span className="text-[11px] font-semibold uppercase tracking-wider">{preset.label}</span>
                       <div className="flex items-center gap-1.5">
                          {preset.icon}
                          <span className="font-bold text-[12px]">MK {Number(preset.value).toLocaleString()}</span>
                       </div>
                    </button>
                 ))}
              </div>

              <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B5CF6] font-bold text-[14px]">MK</div>
                 <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Custom Amount"
                    min="500"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-[12px] pl-12 pr-4 h-12 text-[15px] font-bold text-white outline-none focus:border-[#8B5CF6]/60 transition-all placeholder:text-[#666]"
                 />
              </div>

              <div className="p-4 bg-[#0A0A0A] border border-white/5 rounded-[12px] space-y-2">
                 <div className="flex justify-between items-center text-[11px] font-medium text-[#B0B0B0]">
                    <span>Artist Receives (100%)</span>
                    <span className="text-white font-semibold">MK {(Number(amount) || 0).toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-[11px] font-medium text-[#B0B0B0]">
                    <span>Platform Fee</span>
                    <span className="text-[#22C55E] font-medium">Included at withdrawal</span>
                 </div>
              </div>

              <button 
                onClick={handleSupport}
                disabled={loading || !amount}
                className="w-full h-12 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-[12px] font-semibold text-[14px] shadow-lg shadow-[#8B5CF6]/20 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                 {loading ? 'Processing...' : `Send MK ${(Number(amount) || 0).toLocaleString()}`}
                 <ChevronRight size={18} />
              </button>
           </div>

           <div className="flex items-center justify-center gap-1.5 text-[#B0B0B0] text-[11px]">
              <ShieldCheck size={14} className="text-[#22C55E]" />
              <span>Secured by PayChangu</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SupportArtistModal;
