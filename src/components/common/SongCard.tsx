import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, ShoppingBag, Heart, MoreVertical, Plus, Share2, User, Music2, ListMusic, Info, Gift } from 'lucide-react';
import { Song, UserProfile } from '../../types';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { purchaseTrack } from '../../lib/paychangu';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AddToPlaylistModal from './AddToPlaylistModal';
import SupportArtistModal from './SupportArtistModal';
import toast from 'react-hot-toast';

interface SongCardProps {
  song: Song;
  queue: Song[];
  className?: string;
  layout?: 'grid' | 'list';
}

const SongCard: React.FC<SongCardProps> = ({ song, queue, className = '', layout = 'list' }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, addToQueue, playQueue, dataSaver } = usePlayer();
  const { userProfile } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [artistData, setArtistData] = useState<UserProfile | null>(null);
  const [isLiked, setIsLiked] = useState(() => {
    try {
      const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      return Array.isArray(liked) && liked.includes(song.id);
    } catch (e) {
      return false;
    }
  });

  // Sync likes with global events and DB
  useEffect(() => {
    const handleLikesUpdate = (e: any) => {
      if (e.detail.songId === song.id) {
        setIsLiked(e.detail.isLiked);
      }
    };
    window.addEventListener('smash_likes_updated', handleLikesUpdate);

    // Initial DB check
    const checkLikeStatus = async () => {
      if (!userProfile) return;
      const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('song_id', song.id)
        .maybeSingle();
      
      if (data) {
        setIsLiked(true);
        const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
        if (Array.isArray(liked) && !liked.includes(song.id)) {
           localStorage.setItem('smash_liked_songs', JSON.stringify([...liked, song.id]));
        }
      }
    };
    checkLikeStatus();

    return () => window.removeEventListener('smash_likes_updated', handleLikesUpdate);
  }, [song.id, userProfile?.id]);

  const isCurrent = currentSong?.id === song.id;

  const handleSupportClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (artistData) {
      setShowSupportModal(true);
      return;
    }
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', song.artist_id).single();
      if (data) {
        setArtistData(data);
        setShowSupportModal(true);
      } else {
        toast.error('Artist profile not found.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load artist data.');
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLikeLoading) return;
    
    let liked: string[] = [];
    try {
      liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      if (!Array.isArray(liked)) liked = [];
    } catch (e) {
      liked = [];
    }
    
    // Optimistic UI update
    const previouslyLiked = isLiked;
    setIsLiked(!previouslyLiked);
    setIsLikeLoading(true);

    try {
      let newLiked;
      if (previouslyLiked) {
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
      // Broadcast update
      window.dispatchEvent(new CustomEvent('smash_likes_updated', { 
        detail: { songId: song.id, isLiked: !previouslyLiked } 
      }));
    } catch (err) {
      console.error('Like error:', err);
      // Rollback
      setIsLiked(previouslyLiked);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      playSong(song);
    } else {
      playQueue([song, ...queue.filter(s => s.id !== song.id)]);
    }
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile) {
      toast.error('Please sign in to buy tracks');
      return;
    }
    purchaseTrack({
      song,
      user: userProfile
    });
  };

  if (layout === 'grid') {
    return (
       <div className={`group relative flex flex-col gap-3 p-4 bg-white/5 border border-white/5 hover:border-white/20 rounded-2xl transition-all cursor-pointer ${className}`} onClick={handlePlay}>
         <div className="aspect-square rounded-xl overflow-hidden shadow-2xl">
           <img src={song.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={song.title} />
         </div>
         <div className="space-y-0.5">
           <h3 className="text-white font-black uppercase truncate">{song.title}</h3>
           <p className="text-xs text-smash-gray font-bold uppercase tracking-widest truncate">{song.artist_name}</p>
         </div>
       </div>
    );
  }

  return (
    <div className={`group flex items-center gap-4 bg-white/5 border rounded-2xl p-3 md:p-4 hover:bg-white/10 transition-all cursor-pointer ${isCurrent && isPlaying ? 'ring-2 ring-smash-orange shadow-lg shadow-smash-orange/20 border-smash-orange/50' : 'border-white/10'} ${className}`} onClick={handlePlay}>
        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/5">
          {!dataSaver ? (
            <img src={song.cover_url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-smash-dark flex items-center justify-center">
               <Music2 size={24} className="text-white/20" />
            </div>
          )}
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
           {!song.is_purchased && song.is_for_sale && (
             <button 
               onClick={handleBuy}
               className="flex items-center gap-2 px-3 py-1.5 bg-smash-orange/10 text-smash-orange hover:bg-smash-orange text-[10px] md:text-xs font-black uppercase tracking-widest rounded-full transition-all hover:text-white"
               title={`Buy track for MK ${song.price}`}
             >
               <ShoppingBag size={14} />
               <span className="hidden sm:inline">MK {song.price}</span>
             </button>
           )}
           <button 
             onClick={handleSupportClick}
             className="p-2 rounded-full text-smash-purple hover:bg-smash-purple/20 transition-colors opacity-40 group-hover:opacity-100"
             title="Support Artist"
           >
              <Gift size={16} />
           </button>
           <button 
             onClick={handleLike}
             className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isLiked ? 'text-smash-red opacity-100' : 'text-smash-gray opacity-40 group-hover:opacity-100'}`}
           >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
           </button>
           <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 rounded-full text-smash-gray hover:text-white hover:bg-white/10 transition-all opacity-60 group-hover:opacity-100"
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
          {showSupportModal && artistData && <SupportArtistModal artist={artistData} onClose={() => setShowSupportModal(false)} />}
        </AnimatePresence>
      </div>
  );
};

const SongMenu = ({ song, onClose, onBuy, onAddToPlaylist }: any) => {
  const navigate = useNavigate();
  const { addToQueue } = usePlayer();
  
  const handleShare = async () => {
    const shareData = {
      title: song.title,
      text: `Listen to ${song.title} by ${song.artist_name} on Smashify!`,
      url: window.location.origin + `/artist/${song.artist_id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="absolute right-0 bottom-full md:bottom-auto md:top-full mt-2 mb-2 w-48 glass-morphism border border-white/10 rounded-2xl shadow-2xl z-[100]"
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
        <button 
          onClick={(e) => { e.stopPropagation(); handleShare(); }}
          className="w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-3 hover:bg-white/5 transition-colors text-white"
        >
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
