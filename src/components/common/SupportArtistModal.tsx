import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ShieldCheck, ExternalLink } from 'lucide-react';
import { UserProfile } from '../../types';

interface SupportArtistModalProps {
  artist: UserProfile;
  onClose: () => void;
}

const SupportArtistModal: React.FC<SupportArtistModalProps> = ({ artist, onClose }) => {
  const donationUrl = `https://paychangu.com/donation/${artist.id}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-smash-black/90 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl h-[85vh] glass-morphism border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-smash-orange overflow-hidden">
               <img src={artist.avatar_url || "https://i.pravatar.cc/300"} className="w-full h-full object-cover" alt="" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display italic uppercase tracking-tighter">Support {artist.stage_name || artist.full_name}</h2>
              <div className="flex items-center gap-2">
                <ShieldCheck size={12} className="text-smash-green" />
                <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Secure Payment via Paychangu</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-smash-gray hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content - Iframe */}
        <div className="flex-1 bg-white relative">
           <iframe 
             src={donationUrl}
             className="w-full h-full border-0"
             title={`Support ${artist.stage_name}`}
             allow="payment"
           />
           
           {/* Fallback overlay if iframe fails or is slow */}
           <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-smash-dark/50 opacity-0 hover:opacity-100 transition-opacity">
              <div className="bg-smash-black p-8 rounded-3xl border border-white/10 text-center max-w-sm pointer-events-auto">
                 <Heart size={48} className="text-smash-orange mx-auto mb-4 animate-pulse" />
                 <h3 className="text-xl font-black font-display italic uppercase mb-2">Support In Progress</h3>
                 <p className="text-smash-gray text-sm font-bold mb-6">If the payment window didn't load, you can also support directly.</p>
                 <a 
                   href={donationUrl} 
                   target="_blank" 
                   rel="noreferrer"
                   className="block w-full py-4 bg-white text-smash-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-smash-orange hover:text-white transition-all flex items-center justify-center gap-2"
                 >
                   Open Externally <ExternalLink size={16} />
                 </a>
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-smash-black text-center border-t border-white/5">
           <p className="text-[10px] text-smash-gray font-black uppercase tracking-[0.2em]">Thank you for supporting real music</p>
        </div>
      </motion.div>
    </div>
  );
};

export default SupportArtistModal;
