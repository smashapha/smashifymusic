import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, ShoppingBag, Heart, MoreVertical, Plus, Share2, User, Music2, ListMusic, Info, Gift, Download, Loader2 } from 'lucide-react';
import { Song, UserProfile } from '../../types';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { purchaseTrack } from '../../lib/paychangu';
import { downloadPurchasedSong } from '../../lib/downloads';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AddToPlaylistModal from './AddToPlaylistModal';
import SupportArtistModal from './SupportArtistModal';
import { optimizeImage } from '../../lib/imageUtils';
import toast from 'react-hot-toast';

interface SongCardProps {
  song: Song;
  queue: Song[];
  className?: string;
  layout?: 'grid' | 'list';
}

const SongCard: React.FC<SongCardProps> = ({ song, queue, className = '', layout = 'list' }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, addToQueue, playQueue, dataSaver, purchasedIds } = usePlayer();
  const { userProfile } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [artistData, setArtistData] = useState<UserProfile | null>(null);
  const [artistTier, setArtistTier] = useState<string | null>(() => {
    return (song as any).artist_tier || (song as any).profiles?.artist_tier || (song as any).profiles?.subscription_tier || null;
  });
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile?.id) {
      toast.error('Please log in to download your purchased songs.');
      return;
    }
    setIsDownloading(true);
    try {
      await downloadPurchasedSong(song.id, userProfile.id);
      toast.success('Download started!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (song.is_for_sale && song.price > 0 && !artistTier) {
      const fetchArtistTier = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('artist_tier, subscription_tier')
            .eq('id', song.artist_id)
            .maybeSingle();
          if (data) {
            setArtistTier(data.artist_tier || data.subscription_tier || 'Free');
          }
        } catch (err) {
          console.error('Error fetching artist tier for safety check:', err);
        }
      };
      fetchArtistTier();
    }
  }, [song.id, song.is_for_sale, song.price, song.artist_id, artistTier]);

  const artistCanSell = ['Elite', 'elite', 'Label', 'label'].includes(artistTier || '');

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

    // Debounce DB check to prevent simultaneous queries when many cards mount
    const timer = setTimeout(async () => {
      if (!userProfile?.id || !song?.id) return;
      try {
        const { data } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('song_id', song.id)
          .maybeSingle();

        if (data) {
          setIsLiked(true);
          try {
            const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
            if (Array.isArray(liked) && !liked.includes(song.id)) {
              localStorage.setItem('smash_liked_songs', JSON.stringify([...liked, song.id]));
            }
          } catch (_) {}
        }
      } catch (err) {
        console.error('Error fetching like status:', err);
      }
    }, Math.random() * 800 + 200); // Random 200-1000ms stagger to spread DB load

    return () => {
      clearTimeout(timer);
      window.removeEventListener('smash_likes_updated', handleLikesUpdate);
    };
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
            .eq('profile_id', userProfile.id)
            .eq('song_id', song.id);
          if (error) throw error;
        }
      } else {
        newLiked = [...liked, song.id];
        if (userProfile) {
          const { error } = await supabase
            .from('likes')
            .insert({
              profile_id: userProfile.id,
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
       <div
         className={`group relative flex flex-col gap-2 p-2 hover:bg-white/5 rounded-[12px] transition-all cursor-pointer ${className}`}
         onClick={handlePlay}
       >
         {/* Cover art */}
         <div className="relative aspect-square w-full rounded-[8px] overflow-hidden shadow-sm">
           <img
             src={optimizeImage(song.cover_url || null, 200, 200)}
             className="w-full h-full object-cover group-hover:scale-105 transition-transform"
             alt={song.title || 'Unknown Title'}
           />
           {/* Play overlay */}
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
             {isCurrent && isPlaying
               ? <Pause size={24} fill="white" className="text-white" />
               : <Play size={24} fill="white" className="text-white" />
             }
           </div>
           {/* Currently playing indicator */}
           {isCurrent && isPlaying && (
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
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
           {/* Buy badge */}
           {!song.is_purchased && !purchasedIds?.has(song.id) && song.is_for_sale && song.price > 0 && artistCanSell && (
             <button
               onClick={handleBuy}
               className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-smash-orange text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg`}
             >
               <ShoppingBag size={10} /> MK {song.price}
             </button>
           )}
           {(song.is_purchased || purchasedIds?.has(song.id)) && artistCanSell && (
             <button
               onClick={handleDownload}
               disabled={isDownloading}
               title="Download purchased track"
               className="absolute top-2 left-2 flex items-center justify-center p-2 rounded-xl bg-smash-green text-white shadow-lg disabled:opacity-50 transition-all z-10"
             >
               {isDownloading ? (
                 <Loader2 size={12} className="animate-spin" />
               ) : (
                 <Download size={12} />
               )}
             </button>
           )}
           {/* Menu button - top right */}
           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button
               onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
               className="w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
             >
               <MoreVertical size={14} className="text-white" />
             </button>
             <AnimatePresence>
               {showMenu && (
                 <SongMenu
                   song={song}
                   onClose={() => setShowMenu(false)}
                   onBuy={handleBuy}
                   onAddToPlaylist={() => setShowPlaylistModal(true)}
                 />
               )}
             </AnimatePresence>
           </div>
         </div>
   
         {/* Title + artist + actions row */}
         <div className="flex items-start justify-between gap-1 px-1 mt-1">
           <div className="flex-1 min-w-0">
             <h3 className={`font-display font-semibold text-[13px] truncate leading-tight ${isCurrent ? 'text-smash-orange' : 'text-white'}`}>
               {song.title || "Unknown Title"}
             </h3>
             <p className="text-[11px] text-text-muted font-sans font-normal truncate mt-0.5">
               {song.featured_artist ? `${song.artist_name || 'Unknown'} ft. ${song.featured_artist}` : (song.artist_name || "Unknown Artist")}
             </p>
           </div>
           {/* Like button */}
           <button
             onClick={handleLike}
             className={`shrink-0 p-1 rounded-full transition-colors ${isLiked ? 'text-red-400' : 'text-text-muted opacity-0 group-hover:opacity-100'}`}
           >
             <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
           </button>
         </div>
   
         <AnimatePresence>
           {showPlaylistModal && <AddToPlaylistModal song={song} onClose={() => setShowPlaylistModal(false)} />}
           {showSupportModal && artistData && <SupportArtistModal artist={artistData} onClose={() => setShowSupportModal(false)} />}
         </AnimatePresence>
       </div>
    );
  }

  return (
    <div className={`group flex items-center gap-4 bg-bg-surface border rounded-[14px] p-3 md:p-4 hover:bg-bg-elevated transition-all cursor-pointer ${isCurrent && isPlaying ? 'ring-[2px] ring-smash-orange shadow-sm border-smash-orange/50' : 'border-border-default shadow-sm'} ${className}`} onClick={handlePlay}>
        <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-[10px] overflow-hidden flex-shrink-0 shadow-sm border border-border-default">
          {!dataSaver ? (
            <img src={optimizeImage(song.cover_url || null, 120, 120)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
               <Music2 size={24} className="text-text-muted/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isCurrent && isPlaying ? <Pause size={20} fill="white" className="text-white" /> : <Play size={20} fill="white" className="ml-0.5 text-white" />}
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
          <h4 className={`font-sans font-semibold text-[14px] md:text-[15px] truncate mb-0.5 ${isCurrent ? 'text-smash-orange' : 'text-text-primary'}`}>
            {song.title || "Unknown Title"}
          </h4>
          <div className="flex items-center gap-2">
            <p className="text-[12px] md:text-[13px] text-text-muted font-sans font-medium truncate">{song.featured_artist ? `${song.artist_name || 'Unknown'} ft. ${song.featured_artist}` : (song.artist_name || "Unknown Artist")}</p>
            {song.plays != null && (
              <span className="text-[11px] text-text-secondary font-sans font-medium flex items-center gap-1">
                <Play size={10} fill="currentColor" /> {Number(song.plays || 0).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
           {!song.is_purchased && !purchasedIds?.has(song.id) && song.is_for_sale && song.price > 0 && artistCanSell && (
             <button 
               onClick={handleBuy}
               className={`flex items-center gap-2 px-3 py-1.5 bg-smash-orange/10 text-smash-orange hover:bg-smash-orange text-[10px] md:text-[11px] font-display font-semibold uppercase tracking-widest rounded-full transition-all hover:text-white`}
               title={`Buy track for MK ${song.price}`}
             >
               <ShoppingBag size={14} />
               <span className="hidden sm:inline">MK {song.price}</span>
             </button>
           )}
           {(song.is_purchased || purchasedIds?.has(song.id)) && artistCanSell && (
             <button
               onClick={handleDownload}
               disabled={isDownloading}
               title="Download purchased track"
               className="p-2 rounded-xl bg-smash-green/10 border border-smash-green/20 text-smash-green hover:bg-smash-green/20 transition-all disabled:opacity-50"
             >
               {isDownloading ? (
                 <Loader2 size={14} className="animate-spin" />
               ) : (
                 <Download size={14} />
               )}
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
             className={`p-2 rounded-full hover:bg-bg-elevated transition-colors ${isLiked ? 'text-red-400 opacity-100' : 'text-text-muted opacity-40 group-hover:opacity-100'}`}
           >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
           </button>
           <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all opacity-60 group-hover:opacity-100"
              >
                 <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {showMenu && <SongMenu song={song} onClose={() => setShowMenu(false)} onBuy={handleBuy} onAddToPlaylist={() => setShowPlaylistModal(true)} artistCanSell={artistCanSell} />}
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

const SongMenu = ({ song, onClose, onBuy, onAddToPlaylist, artistCanSell }: any) => {
  const navigate = useNavigate();
  const { addToQueue, purchasedIds } = usePlayer();
  const actualArtistCanSell = artistCanSell !== undefined ? artistCanSell : ['Elite', 'elite', 'Label', 'label'].includes((song.artist_tier || song.profiles?.artist_tier || song.profiles?.subscription_tier || '').toLowerCase());
  
  const handleShare = async () => {
    const displayArtist = song.featured_artist
      ? `${song.artist_name || 'Unknown'} ft. ${song.featured_artist}`
      : (song.artist_name || 'Unknown Artist');
    const shareData = {
      title: song.title,
      text: `Listen to ${song.title} by ${displayArtist} on Smashify!`,
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
        className="absolute right-0 bottom-full md:bottom-auto md:top-full mt-2 mb-2 w-48 bg-bg-surface border border-border-default rounded-[14px] shadow-lg overflow-hidden py-1 z-[100]"
      >
        <button 
          onClick={(e) => { e.stopPropagation(); addToQueue(song); onClose(); }}
          className="w-full px-4 py-2.5 text-left text-[13px] font-sans font-medium flex items-center gap-3 hover:bg-bg-elevated transition-colors text-text-primary"
        >
          <Plus size={16} /> Add to Queue
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onAddToPlaylist(); onClose(); }}
          className="w-full px-4 py-2.5 text-left text-[13px] font-sans font-medium flex items-center gap-3 hover:bg-bg-elevated transition-colors text-text-primary"
        >
          <ListMusic size={16} /> Add to Playlist
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleShare(); }}
          className="w-full px-4 py-2.5 text-left text-[13px] font-sans font-medium flex items-center gap-3 hover:bg-bg-elevated transition-colors text-text-primary"
        >
          <Share2 size={16} /> Share Song
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); navigate(`/artist/${song.artist_id}`); onClose(); }}
          className="w-full px-4 py-2.5 text-left text-[13px] font-sans font-medium flex items-center gap-3 hover:bg-bg-elevated transition-colors text-text-primary"
        >
          <User size={16} /> Go to Artist
        </button>
        <button className="w-full px-4 py-2.5 text-left text-[13px] font-sans font-medium flex items-center gap-3 hover:bg-bg-elevated transition-colors text-text-primary">
          <Info size={16} /> Song Details
        </button>
        {!song.is_purchased && !purchasedIds?.has(song.id) && song.is_for_sale && song.price > 0 && actualArtistCanSell && (
          <>
            <div className="h-px w-full bg-border-default my-1" />
            <button 
              onClick={onBuy}
              className={`w-full px-4 py-2.5 text-left text-[13px] font-display font-semibold flex items-center gap-3 bg-smash-orange/10 text-smash-orange hover:bg-smash-orange/20 transition-colors uppercase tracking-widest`}
            >
              <ShoppingBag size={14} /> Buy MK {song.price}
            </button>
          </>
        )}
      </motion.div>
    </>
  );
};

export default SongCard;
