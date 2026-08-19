import React, { useState } from 'react';
import { Play, MoreVertical } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { SongMenu } from './SongCard';
import AddToPlaylistModal from './AddToPlaylistModal';
import SupportArtistModal from './SupportArtistModal';
import { optimizeImage } from '../../lib/imageUtils';
import { purchaseTrack } from '../../lib/paychangu';
import { downloadPurchasedSong } from '../../lib/downloads';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { useRequireAuth } from '../../context/AuthGateContext';

export default function QuickPickCard({ song, queue }: { song: any, queue: any[], key?: React.Key }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  
  const { playQueue } = usePlayer();
  const { userProfile } = useAuth();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(() => {
      purchaseTrack({
        song,
        user: userProfile
      });
    });
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(async () => {
      await downloadPurchasedSong(song, userProfile);
    });
  };

  return (
    <div 
      className="relative flex items-center gap-4 p-2.5 rounded-[16px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 snap-start group cursor-pointer transition-all duration-300" 
      onClick={() => {
        const newQueue = [song, ...queue.filter(s => s.id !== song.id)];
        playQueue(newQueue);
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#00A3FF]/0 via-[#00A3FF]/0 to-[#00A3FF]/5 opacity-0 group-hover:opacity-100 rounded-[16px] transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative w-[56px] h-[56px] rounded-[10px] overflow-hidden flex-shrink-0 bg-black/40 shadow-md">
         <img src={optimizeImage(song.cover_url, 120, 120)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" decoding="async" />
         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
            <Play size={20} className="fill-white text-white ml-1 drop-shadow-md" />
         </div>
      </div>
      
      <div className="flex-1 min-w-0 z-10">
        <h4 className="text-[15px] font-bold text-white truncate mb-1 group-hover:text-[#00A3FF] transition-colors">{song.title}</h4>
        <div className="flex items-center gap-2">
          {song.is_explicit && <span className="px-1 py-[1px] bg-white/10 text-white rounded-[4px] text-[9px] font-black tracking-wider uppercase">E</span>}
          <span className="text-[13px] text-[#B0B0B0] truncate group-hover:text-white/80 transition-colors">{song.artist_name || song.profiles?.stage_name || song.profiles?.full_name}</span>
        </div>
      </div>
      
      <div className="relative z-20">
        <button 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/50 hover:text-white hover:bg-[#00A3FF] opacity-0 group-hover:opacity-100 transition-all shadow-sm shadow-black/50" 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        >
          <MoreVertical size={16} />
        </button>
        <AnimatePresence>
          {showMenu && (
            <SongMenu 
              song={song} 
              onClose={() => setShowMenu(false)} 
              onBuy={handleBuy} 
              onDownload={handleDownload} 
              onAddToPlaylist={() => { setShowMenu(false); setShowPlaylistModal(true); }} 
            />
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showPlaylistModal && <AddToPlaylistModal song={song} onClose={() => setShowPlaylistModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
