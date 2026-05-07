import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, ShoppingBag, Heart, MoreVertical, Plus, Share2, User, Music2, ListMusic, Info } from 'lucide-react';
import { Song } from '../../types';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { buyTrack } from '../../lib/paychangu';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AddToPlaylistModal from './AddToPlaylistModal';

interface SongCardProps {
  song: Song;
  queue: Song[];
  className?: string;
  variant?: 'grid' | 'list';
}

const SongCard: React.FC<SongCardProps> = ({ song, queue, className = '', variant = 'list' }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, addToQueue } = usePlayer();
  const { userProfile } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isLiked, setIsLiked] = useState(() => {
    try {
      const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      return Array.isArray(liked) && liked.includes(song.id);
    } catch (e) {
      return false;
    }
  });

  const isCurrent = currentSong?.id === song.id;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let liked: string[] = [];
    try {
      liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      if (!Array.isArray(liked)) liked = [];
    } catch (e) {
      liked = [];
    }
    let newLiked;
    
    try {
      if (isLiked) {
        newLiked = liked.filter((id: string) => id !== song.id);
        if (userProfile) {
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', userProfile.id)
            .eq('song_id', song.id);
          if (error) throw error;
        }
      } else {
        newLiked = [...liked, song.id];
        if (userProfile) {
          const { error } = await supabase
            .from('likes')
            .insert({
              user_id: userProfile.id,
              song_id: song.id
            });
          if (error) throw error;
        }
      }
      localStorage.setItem('smash_liked_songs', JSON.stringify(newLiked));
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSong(song, queue);
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile) {
      alert('Please sign in to buy tracks');
      return;
    }
    buyTrack({
      song,
      user: userProfile,
      onSuccess: () => {
        alert('Purchase successful! You now own ' + song.title);
        window.location.reload();
      }
    });
  };

  if (variant === 'list') {
    return (
      <div className={`group flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 hover:bg-white/10 transition-all cursor-pointer ${className}`} onClick={handlePlay}>
        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/5">
          <img src={song.cover_url} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isCurrent && isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-0.5" />}
          </div>
          {isCurrent && isPlaying && (
            <div className="absolute inset-x-0 bottom-0 top-0 bg-black/40 flex items-center justify-center gap-0.5">
               {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, 12, 6, 10, 4] }}
                    transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: 'linear' }}
                    className="w-0.5 bg-smash-orange rounded-full"
                  />
                ))}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-display font-black italic uppercase text-sm md:text-base truncate leading-none mb-1 ${isCurrent ? 'text-smash-orange' : 'text-white'}`}>
            {song.title}
          </h4>
          <div className="flex items-center gap-2">
            <p className="text-[10px] md:text-xs text-smash-gray font-black uppercase tracking-widest truncate">{song.artist_name}</p>
            {song.plays !== undefined && (
              <span className="text-[10px] text-white/30 font-bold flex items-center gap-1">
                <Play size={8} fill="currentColor" /> {song.plays.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
           <button 
             onClick={handleLike}
             className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isLiked ? 'text-smash-red' : 'text-smash-gray opacity-0 group-hover:opacity-100'}`}
           >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
           </button>
           <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 rounded-full text-smash-gray hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
              >
                 <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {showMenu && <SongMenu song={song} onClose={() => setShowMenu(false)} onBuy={handleBuy} onAddToPlaylist={() => setShowPlaylistModal(true)} />}
              </AnimatePresence>
           </div>
        </div>
        <AnimatePresence>
          {showPlaylistModal && <AddToPlaylistModal song={song} onClose={() => setShowPlaylistModal(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      className={`group relative bento-card p-4 bg-smash-dark/40 border-white/5 hover:border-smash-orange/30 transition-all cursor-pointer ${className}`}
      onClick={handlePlay}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 shadow-2xl">
        <img 
          src={song.cover_url} 
          alt={song.title} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
          referrerPolicy="no-referrer"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-14 h-14 rounded-full bg-smash-orange text-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
            {isCurrent && isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
          </div>
        </div>

        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
           {song.is_purchased ? (
             <div className="px-3 py-1 bg-smash-green text-black text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">OWNED</div>
           ) : song.is_for_sale ? (
             <div className="px-3 py-1 bg-smash-orange text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">MK {song.price}</div>
           ) : null}
        </div>

        {/* Equalizer Animation */}
        {isCurrent && isPlaying && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, 24, 8, 16, 4] }}
                transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: 'linear' }}
                className="w-1 bg-smash-orange rounded-full"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className={`font-display font-black text-lg italic uppercase tracking-tight truncate ${isCurrent ? 'text-smash-orange' : 'text-white'}`}>
            {song.title}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-smash-gray font-bold truncate hover:text-white transition-colors">{song.artist_name}</p>
            {song.plays !== undefined && (
              <span className="text-[10px] text-smash-gray flex items-center gap-1">
                <Play size={8} fill="currentColor" /> {song.plays.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={handleLike}
             className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isLiked ? 'text-smash-red' : 'text-smash-gray'}`}
           >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
           </button>
           <div className="relative">
             <button 
               onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
               className="p-2 rounded-full text-smash-gray hover:text-white hover:bg-white/10 transition-all"
             >
                <MoreVertical size={18} />
             </button>
             
             <AnimatePresence>
               {showMenu && <SongMenu song={song} onClose={() => setShowMenu(false)} onBuy={handleBuy} onAddToPlaylist={() => setShowPlaylistModal(true)} />}
             </AnimatePresence>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showPlaylistModal && (
          <AddToPlaylistModal 
            song={song} 
            onClose={() => setShowPlaylistModal(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SongMenu = ({ song, onClose, onBuy, onAddToPlaylist }: any) => {
  const navigate = useNavigate();
  const { addToQueue } = usePlayer();
  
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute right-0 bottom-full md:bottom-auto md:top-full mt-2 mb-2 w-48 glass-morphism border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
      >
        <button 
          onClick={(e) => { e.stopPropagation(); addToQueue(song); onClose(); }}
          className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 hover:bg-white/5 transition-colors text-white"
        >
          <Plus size={16} /> Add to Queue
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onAddToPlaylist(); onClose(); }}
          className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 hover:bg-white/5 transition-colors text-white"
        >
          <ListMusic size={16} /> Add to Playlist
        </button>
        <button className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 hover:bg-white/5 transition-colors text-white">
          <Share2 size={16} /> Share Song
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); navigate(`/artist/${song.artist_id}`); onClose(); }}
          className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 hover:bg-white/5 transition-colors text-white"
        >
          <User size={16} /> Go to Artist
        </button>
        <button className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 hover:bg-white/5 transition-colors text-white">
          <Info size={16} /> Song Details
        </button>
        {!song.is_purchased && song.is_for_sale && (
          <button 
            onClick={onBuy}
            className="w-full px-4 py-3 text-left text-sm font-black flex items-center gap-3 bg-smash-orange/10 text-smash-orange hover:bg-smash-orange/20 transition-colors"
          >
            <ShoppingBag size={16} /> Buy MK {song.price}
          </button>
        )}
      </motion.div>
    </>
  );
};

export default SongCard;
