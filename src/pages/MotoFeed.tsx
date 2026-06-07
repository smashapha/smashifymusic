import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { 
  Play, Pause, Heart, Share2, ShoppingBag, Music2, 
  ArrowUp, ArrowDown, UserPlus, Disc, Flame, Volume2, VolumeX, Check, X as XIcon, Gift, Ban, Clock,
  MessageCircle, Send
} from 'lucide-react';
import { startFanSubscription, sendTip, purchaseTrack } from '../lib/paychangu';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Song } from '../types';
import Avatar from '../components/common/Avatar';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { getListenerLimits } from '../lib/tierUtils';

import { useNavigate } from 'react-router-dom';

import { Sidebar, BottomNav } from '../components/common/MainLayout';

const MotoCard = ({ song, active, onSkip }: { song: Song; active: boolean; onSkip: () => void }) => {
  const navigate = useNavigate();
  const { playSong, isPlaying, togglePlay, currentTime, duration, seek, volume, setVolume, purchasedIds } = usePlayer();
  const { userProfile } = useAuth();
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentCount, setCommentCount] = useState(0);
  const [likeCount, setLikeCount] = useState((song as any).likes_count || 0);

  const lastTapTime = useRef(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const [isLiked, setIsLiked] = useState(() => {
    try {
      const liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      return Array.isArray(liked) && liked.includes(song.id);
    } catch (e) {
      return false;
    }
  });

  const formatCount = (n: number) => n > 1000 ? `${(n/1000).toFixed(1)}K` : n;

  useEffect(() => {
    const fetchComments = async () => {
      const { data, count } = await supabase
        .from('moto_comments')
        .select('*, profiles:profile_id(stage_name, full_name, avatar_url)', { count: 'exact' })
        .eq('song_id', song.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setComments(data.reverse());
      if (count !== null) setCommentCount(count);
    };
    fetchComments();

    const channel = supabase.channel(`comments-${song.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moto_comments', filter: `song_id=eq.${song.id}` }, () => {
        fetchComments();
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [song.id]);
  
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userProfile) return;
    try {
      await supabase.from('moto_comments').insert({
        song_id: song.id,
        profile_id: userProfile.id,
        content: newComment.substring(0, 200)
      });
      setNewComment("");
    } catch (err) {
      toast.error("Failed to post comment");
    }
  };

  useEffect(() => {
      const handleGlobalLike = () => { if (active) handleLike(); };
      window.addEventListener('motofeed_like_trigger', handleGlobalLike);
      return () => window.removeEventListener('motofeed_like_trigger', handleGlobalLike);
  }, [active, isLiked, song.id]);
  
  const logEvent = async (eventType: string) => {
    try {
      if (!song.id || eventType === 'play_started') return; // ignore initial load spam
      await supabase.from('moto_events').insert({
         song_id: song.id,
         profile_id: userProfile?.id,
         event_type: eventType
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (active) {
      logEvent('play');
    }
  }, [active]);

  const [hasLoggedComplete, setHasLoggedComplete] = useState(false);
  useEffect(() => {
    if (active && duration > 0 && currentTime > duration * 0.8 && !hasLoggedComplete) {
      logEvent('complete');
      setHasLoggedComplete(true);
    }
  }, [currentTime, duration, active, hasLoggedComplete]);

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

  const [isFollowing, setIsFollowing] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tipAmount, setTipAmount] = useState(500);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const passOpacity = useTransform(x, [-150, -50], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      handleLike({ stopPropagation: () => {} }); // swipe right = like
    } else if (info.offset.x < -100) {
      // swipe left = skip / pass
      logEvent('skip');
      onSkip();
    }
  };

  useEffect(() => {
    if (active) {
      playSong(song);
    }
  }, [active]);

  useEffect(() => {
    const checkFollowAndSub = async () => {
      if (!userProfile || !song.artist_id) return;
      const { data: follow } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_id', userProfile.id)
        .eq('artist_id', song.artist_id)
        .maybeSingle();
      if (follow) setIsFollowing(true);

      const { data: sub } = await supabase
        .from('fan_subscriptions')
        .select('*')
        .eq('fan_id', userProfile.id)
        .eq('artist_id', song.artist_id)
        .eq('status', 'active')
        .maybeSingle();
      if (sub) setIsSubscribed(true);
    };
    checkFollowAndSub();
  }, [userProfile, song.artist_id]);

  const handleLike = async (e?: React.MouseEvent | any) => {
    if (e) e.stopPropagation();
    let liked: string[] = [];
    try {
      liked = JSON.parse(localStorage.getItem('smash_liked_songs') || '[]');
      if (!Array.isArray(liked)) liked = [];
    } catch (e) {
      liked = [];
    }
    
    // Optimistic UI
    const previouslyLiked = isLiked;
    setIsLiked(!previouslyLiked);

    if (!previouslyLiked) {
       logEvent('like');
       setLikeCount((prev: number) => prev + 1);
    } else {
       setLikeCount((prev: number) => prev > 0 ? prev - 1 : 0);
    }

    try {
      let newLiked;
      if (previouslyLiked) {
        newLiked = liked.filter((id: string) => id !== song.id);
        if (userProfile) {
          const { error } = await supabase.from('likes').delete().eq('profile_id', userProfile.id).eq('song_id', song.id);
          if (error) throw error;
        }
      } else {
        newLiked = [...liked, song.id];
        if (userProfile) {
          const { error } = await supabase.from('likes').insert({ profile_id: userProfile.id, song_id: song.id });
          if (error) throw error;
        }
      }
      localStorage.setItem('smash_liked_songs', JSON.stringify(newLiked));
      // Broadcast update
      window.dispatchEvent(new CustomEvent('smash_likes_updated', { 
        detail: { songId: song.id, isLiked: !previouslyLiked } 
      }));
    } catch (err) {
      console.error('Like error', err);
      // Rollback on offline or error
      setIsLiked(previouslyLiked);
      if (!previouslyLiked) setLikeCount((prev: number) => prev > 0 ? prev - 1 : 0);
      else setLikeCount((prev: number) => prev + 1);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userProfile) {
       toast.error('Sign in to follow artists');
       return;
    }
    try {
       if (isFollowing) {
          const { error } = await supabase.from('followers').delete().eq('follower_id', userProfile.id).eq('artist_id', song.artist_id);
          if (error) throw error;
          setIsFollowing(false);
          toast.success(`Unfollowed artist`);
       } else {
          const { error } = await supabase.from('followers').insert({ follower_id: userProfile.id, artist_id: song.artist_id });
          if (error) throw error;
          setIsFollowing(true);
          toast.success(`Following artist!`);
       }
    } catch (err: any) {
       toast.error(err.message);
    }
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    logEvent('buy_tap');
    if (!userProfile) {
       toast.error('Sign in to buy tracks');
       return;
    }
    purchaseTrack({
       song,
       user: userProfile
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    logEvent('share');
    try {
       await supabase.rpc('increment_shares', { song_id: song.id });
    } catch {}
    const url = `${window.location.origin}/artist/${song.artist_id}`;
    if (navigator.share) {
      navigator.share({
        title: song.title,
        text: `Check out ${song.title} by ${song.artist_name} on Smashify!`,
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Artist link copied to clipboard!');
    }
  };

  const isPurchased = song.is_purchased || purchasedIds.has(song.id);
  const isPreviewLimit = !isPurchased && currentTime >= 30;
  const isApproachingLimit = !isPurchased && currentTime >= 25 && currentTime < 30;

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (!isLiked) {
        handleLike(e);
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 800);
      }
    } else {
      togglePlay();
    }
    lastTapTime.current = now;
  };

  return (
    <div className="relative h-full w-full bg-smash-black overflow-hidden flex flex-col items-center justify-center cursor-pointer" onClick={handleContainerClick}>
      {/* Background Layer */}
      <div className="absolute inset-0 bg-smash-black">
        <img 
          src={song.cover_url} 
          className="w-full h-full object-cover blur-3xl opacity-40 scale-150" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
      </div>

      {/* Main Content */}
      <div className="relative h-full w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 pb-40">
         <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           style={{ x, rotate }}
           drag="x"
           dragConstraints={{ left: 0, right: 0 }}
           onDragEnd={handleDragEnd}
           className="relative aspect-square w-full max-w-[340px] md:max-w-[400px] shadow-[0_0_80px_rgba(255,95,0,0.3)] group"
         >
            <img 
              src={song.cover_url} 
              className={`w-full h-full object-cover rounded-[40px] md:rounded-[60px] border-4 border-white/10 ${isPlaying ? 'animate-pulse' : ''}`} 
              alt={song.title} 
              referrerPolicy="no-referrer"
            />
            {/* Swipe Indicators */}
            <motion.div style={{ opacity: likeOpacity }} className="absolute inset-0 bg-smash-green/20 rounded-[40px] md:rounded-[60px] flex items-center justify-center backdrop-blur-sm pointer-events-none z-10 p-4">
               <Heart size={80} className="text-white fill-current" />
            </motion.div>
            <motion.div style={{ opacity: passOpacity }} className="absolute inset-0 bg-black/60 rounded-[40px] md:rounded-[60px] flex items-center justify-center backdrop-blur-sm pointer-events-none z-10 p-4">
               <XIcon size={80} className="text-white" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-[40px] md:rounded-[60px] pointer-events-none">
               <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/30">
                  {isPlaying ? <Pause size={40} /> : <Play size={40} className="ml-2" />}
               </div>
            </div>
            {/* Heart Burst Animation */}
            <AnimatePresence>
               {showHeartBurst && (
                 <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    exit={{ opacity: 0, scale: 2 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                 >
                    <Heart size={120} className="text-white fill-white drop-shadow-[0_0_40px_rgba(255,255,255,1)]" />
                 </motion.div>
               )}
            </AnimatePresence>
         </motion.div>

         {isApproachingLimit && !song.is_unreleased && (
            <AnimatePresence>
               <motion.div 
                 initial={{ y: '100%', opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: '100%', opacity: 0 }}
                 className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl z-40 shadow-2xl flex flex-col gap-4 text-center cursor-default"
                 onClick={(e: any) => e.stopPropagation()}
               >
                  <p className="text-white font-studio font-bold uppercase text-[16px]">30 sec preview ending</p>
                  <p className="text-smash-gray text-xs font-bold uppercase tracking-widest pb-2">Buy to hear the rest</p>
                  <div className="flex gap-3">
                     <button 
                       onClick={handleBuy}
                       className="flex-1 py-3 bg-smash-orange text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                     >
                        BUY (MK {song.price})
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); onSkip(); }}
                       className="flex-1 py-3 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors"
                     >
                        SKIP SONG
                     </button>
                  </div>
               </motion.div>
            </AnimatePresence>
         )}

         {isPreviewLimit && !song.is_unreleased && (
            <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 rounded-[40px] md:rounded-[60px] cursor-default" onClick={(e: any) => e.stopPropagation()}>
               <ShoppingBag size={48} className="text-smash-orange mb-4" />
               <h3 className="text-[24px] font-studio font-bold uppercase mb-2 text-white">Full Track Available</h3>
               <p className="text-sm text-smash-gray font-bold mb-6 italic tracking-tight">Buy this anthem to support {song.artist_name} and hear the rest.</p>
               <button 
                 onClick={handleBuy}
                 className="w-full max-w-[240px] px-8 py-4 bg-smash-orange text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-smash-orange/20 mb-4 hover:scale-105 transition-transform"
               >
                  BUY FOR MK {song.price}
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onSkip(); }}
                 className="w-full max-w-[240px] px-8 py-4 bg-transparent border border-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/5 transition-colors"
               >
                  SKIP THIS SONG
               </button>
            </div>
         )}

         {showTipModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 cursor-default" onClick={(e: any) => { e.stopPropagation(); setShowTipModal(false); }}>
               <div className="bg-white text-black p-8 rounded-3xl w-full max-w-sm flex flex-col items-center shadow-xl" onClick={(e: any) => e.stopPropagation()}>
                  <Avatar src={song.profiles?.avatar_url} name={song.profiles?.stage_name || song.profiles?.full_name} className="w-20 h-20 mb-4" />
                  <h3 className="text-xl font-black italic uppercase mb-1">Send a tip</h3>
                  <p className="text-sm font-bold text-gray-500 mb-6">to {song.artist_name}</p>
                  
                  <div className="grid grid-cols-2 gap-3 w-full mb-4">
                     {[500, 1000, 2000, 5000].map(amt => (
                        <button 
                           key={amt} 
                           onClick={() => setTipAmount(amt)}
                           className={`py-3 rounded-xl font-bold transition-all border-2 ${tipAmount === amt ? 'bg-smash-black text-white border-smash-black' : 'bg-gray-100 text-black border-transparent hover:border-smash-black/40'}`}
                        >
                           MK {amt.toLocaleString()}
                        </button>
                     ))}
                  </div>

                  <input 
                     type="number" 
                     value={tipAmount} 
                     onChange={(e) => setTipAmount(Number(e.target.value))}
                     className="w-full bg-gray-100 px-4 py-3 rounded-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-smash-black mb-4"
                  />

                  <label className="flex items-center gap-2 mb-6 cursor-pointer self-start ml-2">
                     <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="w-4 h-4 rounded" />
                     <span className="text-sm font-bold text-gray-600">Send anonymously</span>
                  </label>

                  <button 
                     onClick={() => {
                        if (!userProfile) return toast.error('Sign in to tip artists');
                        sendTip({ 
                           artist: { id: song.artist_id, ...song.profiles } as any, 
                           fan: userProfile, 
                           amount: tipAmount,
                           anonymous: isAnonymous
                        });
                     }}
                     className="w-full py-4 bg-smash-cyan text-black font-black uppercase text-sm tracking-widest rounded-xl hover:scale-105 transition-transform"
                  >
                     Send MK {tipAmount.toLocaleString()}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-4 uppercase font-bold text-center">
                     90% goes directly to {song.artist_name}
                  </p>
               </div>
            </div>
         )}

         {showSubModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 cursor-default" onClick={(e: any) => { e.stopPropagation(); setShowSubModal(false); }}>
               <div className="bg-white text-black p-8 rounded-3xl w-full max-w-sm flex flex-col items-center shadow-xl text-center" onClick={(e: any) => e.stopPropagation()}>
                  <Heart size={48} className={isSubscribed ? "fill-smash-green text-smash-green mb-4" : "fill-smash-purple text-smash-purple mb-4"} />
                  <h3 className="text-xl font-black italic uppercase mb-2">
                     {isSubscribed ? 'Cancel Support?' : `Support ${song.artist_name}`}
                  </h3>
                  <p className="text-sm font-bold text-gray-500 mb-8">
                     {isSubscribed 
                        ? `Cancel your MK 500/month support for ${song.artist_name}?` 
                        : "MK 500/month — cancel anytime"
                     }
                  </p>
                  
                  {isSubscribed ? (
                     <button 
                        onClick={async () => {
                           if (!userProfile) return;
                           const { error } = await supabase.from('fan_subscriptions').update({ status: 'cancelled' }).eq('fan_id', userProfile.id).eq('artist_id', song.artist_id);
                           if (!error) {
                              setIsSubscribed(false);
                              setShowSubModal(false);
                              toast.success('Subscription cancelled');
                           }
                        }}
                        className="w-full py-4 bg-gray-200 text-black font-black uppercase text-sm tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                     >
                        Yes, Cancel
                     </button>
                  ) : (
                     <button 
                        onClick={() => {
                           if (!userProfile) return toast.error('Sign in to subscribe');
                           startFanSubscription({ 
                              artist: { id: song.artist_id, ...song.profiles } as any, 
                              fan: userProfile
                           });
                        }}
                        className="w-full py-4 bg-smash-purple text-white font-black uppercase text-sm tracking-widest rounded-xl hover:scale-105 transition-transform shadow-xl shadow-smash-purple/20"
                     >
                        Subscribe via Airtel/TNM
                     </button>
                  )}
               </div>
            </div>
         )}

         {/* Meta Overlay (Bottom) */}
         <div className="absolute bottom-10 left-8 right-24 space-y-4 pointer-events-auto">
            <div className="flex flex-wrap gap-2">
               {song.is_unreleased && (
                  <span className="px-3 py-1 bg-smash-purple text-white text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-1">
                     <Flame size={12} /> Unreleased Snippet
                  </span>
               )}
               <span className="px-3 py-1 bg-smash-orange text-white text-[10px] font-black rounded-full uppercase tracking-widest">{song.genre || 'Trending'}</span>
               {song.region && <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{song.region}</span>}
            </div>
            <div>
               <h2 className="text-[32px] md:text-[44px] font-studio font-bold uppercase tracking-tight leading-[1.1] mb-2 text-white">{song.title}</h2>
               <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-white/80">{song.artist_name || (song.profiles as any)?.stage_name || (song.profiles as any)?.full_name}</p>
                  {song.profiles?.verified && <div className="w-4 h-4 bg-smash-cyan rounded-full flex items-center justify-center"><Check size={10} className="text-black" /></div>}
               </div>
            </div>
         </div>

         {/* Action Bar (Right) */}
         <div className="absolute right-6 bottom-32 flex flex-col items-center gap-8 pointer-events-auto">
            <div className="flex flex-col items-center gap-0">
               <div 
                  className="w-14 h-14 rounded-full border-4 border-smash-black overflow-hidden bg-smash-dark ring-2 ring-smash-orange relative hover:scale-110 transition-transform cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); navigate(`/artist/${song.artist_id}`); }}
               >
                  <Avatar src={song.profiles?.avatar_url} name={song.profiles?.stage_name || song.profiles?.full_name} className="w-full h-full" />
               </div>
               <button 
                  onClick={handleFollow}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white border-2 border-smash-black z-10 -mt-3 hover:scale-110 transition-transform shadow-lg ${isFollowing ? 'bg-smash-green' : 'bg-smash-orange'}`}
               >
                  {isFollowing ? <Check size={14} className="text-black" /> : <UserPlus size={14} />}
               </button>
            </div>

            <div className="flex flex-col items-center gap-2">
               <button 
                  onClick={handleLike}
                  className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-all border border-white/10"
               >
                  <Heart size={24} className={isLiked ? "fill-smash-orange text-smash-orange" : ""} />
               </button>
            </div>

            <div className="flex flex-col items-center gap-2">
               <button 
                  onClick={handleShare}
                  className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-all border border-white/10"
               >
                  <Share2 size={24} />
               </button>
            </div>

            <div className="flex flex-col items-center gap-2">
               <button 
                  onClick={(e) => { e.stopPropagation(); setShowTipModal(true); }}
                  className="w-14 h-14 bg-smash-cyan rounded-full flex items-center justify-center text-black hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)]"
               >
                  <Gift size={24} />
               </button>
               <span className="text-[10px] font-black text-smash-cyan uppercase tracking-widest">TIP</span>
            </div>

            {(song.profiles as any)?.subscription_tier !== 'free' && (song.profiles as any)?.subscription_tier !== 'Free' && (
               <div className="flex flex-col items-center gap-2">
                  <button 
                     onClick={(e) => { e.stopPropagation(); setShowSubModal(true); }}
                     className={`w-14 h-14 rounded-full flex items-center justify-center text-white hover:scale-110 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] ${isSubscribed ? 'bg-smash-green' : 'bg-smash-purple'}`}
                  >
                     <Heart size={24} className={isSubscribed ? "fill-white" : ""} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isSubscribed ? '#00FF66' : '#9900FF' }}>
                     {isSubscribed ? 'SUBBED' : 'SUB'}
                  </span>
               </div>
            )}

            {song.is_for_sale && !song.is_unreleased && !song.is_purchased && !purchasedIds.has(song.id) && ((song.profiles as any)?.subscription_tier || (song.profiles as any)?.artist_tier || 'Free').toLowerCase() !== 'free' && (
               <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={handleBuy}
                    className="w-14 h-14 bg-smash-orange rounded-full flex items-center justify-center text-white hover:scale-110 transition-all shadow-[0_0_20px_rgba(255,95,0,0.4)]"
                  >
                     <ShoppingBag size={24} />
                  </button>
                  <span className="text-[10px] font-black text-smash-orange uppercase tracking-widest">BUY</span>
               </div>
            )}

            <motion.div 
               animate={{ rotate: isPlaying ? 360 : 0 }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="w-14 h-14 rounded-full bg-smash-dark border-4 border-white/20 flex items-center justify-center p-2 mt-4 cursor-pointer"
               onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            >
               <Disc className="text-smash-gray" size={24} />
            </motion.div>
         </div>
         {/* Progress Bar */}
         {!isPurchased && !song.is_unreleased && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-50">
               <div 
                  className={`h-full transition-all duration-300 ${isApproachingLimit ? 'bg-smash-cyan' : 'bg-smash-orange'}`}
                  style={{ width: `${Math.min((currentTime / 30) * 100, 100)}%` }}
               />
            </div>
         )}
         {(isPurchased || ['premium', 'Premium'].includes((userProfile as any)?.subscription_tier)) && (
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/60 to-transparent pt-4">
               <div className="px-6 py-2 flex items-center justify-between pointer-events-none text-[10px] font-bold text-white/80 tracking-widest drop-shadow-md">
                  <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                  <span>{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
               </div>
               <div 
                  className="h-3 bg-white/10 w-full cursor-pointer touch-none pointer-events-auto group" 
                  onClick={(e) => {
                     e.stopPropagation();
                     const rect = e.currentTarget.getBoundingClientRect();
                     const x = e.clientX - rect.left;
                     const pct = x / rect.width;
                     seek(pct * duration);
                  }}
               >
                  <div 
                     className="h-full bg-smash-orange transition-all duration-100 group-hover:bg-smash-cyan"
                     style={{ width: `${Math.min((currentTime / duration) * 100, 100)}%` }}
                  />
               </div>
            </div>
         )}
      </div>

      {/* Comments Drawer */}
      <AnimatePresence>
        {showComments && (
           <>
              <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
                 onClick={(e: any) => { e.stopPropagation(); setShowComments(false); }}
              />
              <motion.div 
                 initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                 transition={{ type: "spring", damping: 25, stiffness: 200 }}
                 className="absolute bottom-0 left-0 right-0 h-[60vh] bg-smash-black border-t border-white/10 rounded-t-[32px] z-50 flex flex-col cursor-auto"
                 onClick={(e: any) => e.stopPropagation()}
              >
                 <div className="p-4 flex flex-col items-center border-b border-white/10 shrink-0 relative">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mb-4" />
                    <h3 className="text-lg font-black uppercase text-white tracking-widest">Comments <span className="text-smash-gray text-sm ml-1">({commentCount})</span></h3>
                    <button onClick={() => setShowComments(false)} className="absolute right-6 top-6 p-2 rounded-full bg-white/5 hover:bg-white/10">
                       <XIcon size={20} />
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {comments.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-smash-gray/50">
                          <MessageCircle size={48} className="mb-4" />
                          <p className="font-bold uppercase tracking-widest">No comments yet.</p>
                       </div>
                    ) : (
                       comments.map((c) => (
                          <div key={c.id} className="flex gap-4 items-start">
                             <Avatar src={c.profiles?.avatar_url} name={c.profiles?.stage_name || c.profiles?.full_name} className="w-10 h-10 rounded-full shrink-0" />
                             <div className="flex-1">
                                <span className="text-xs font-black text-smash-gray">{c.profiles?.stage_name || c.profiles?.full_name}</span>
                                <p className="text-sm text-white font-bold leading-relaxed">{c.content}</p>
                             </div>
                          </div>
                       ))
                    )}
                 </div>

                 <div className="p-4 border-t border-white/10 bg-smash-dark/80 shrink-0">
                    <form onSubmit={handlePostComment} className="flex gap-3 items-center">
                       <input 
                         type="text" 
                         value={newComment}
                         onChange={(e) => setNewComment(e.target.value)}
                         maxLength={200}
                         placeholder="Add a comment..."
                         className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm text-white focus:outline-none focus:border-smash-orange font-bold transition-colors"
                       />
                       <button 
                         type="submit" 
                         disabled={!newComment.trim()}
                         className="w-12 h-12 bg-smash-orange text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-white/10"
                       >
                          <Send size={18} />
                       </button>
                    </form>
                 </div>
              </motion.div>
           </>
        )}
      </AnimatePresence>
    </div>
  );
};

const AudioAdCard = ({ ad, onFinish }: { ad: any, onFinish: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(ad.duration_seconds || 30);
  const { volume, setVolume } = usePlayer();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  useEffect(() => {
    // Increment plays_used
    if (ad.id) {
       supabase.rpc('increment_ad_plays', { ad_id: ad.id }).then();
       supabase.from('audio_ad_plays').insert({
         ad_id: ad.id,
         listener_id: userProfile?.id,
         listener_city: userProfile?.city,
         source: 'feed',
         completed: false // Updated to true on finish
       }).then();
    }
    
    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(interval);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ad, onFinish]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVolume(volume === 0 ? 0.8 : 0);
  };

  return (
    <div className="relative h-full w-full bg-smash-black overflow-hidden flex flex-col items-center justify-center">
       {/* Background */}
       <div className="absolute inset-0 bg-gradient-to-br from-smash-black via-smash-dark to-[#090909]">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
       </div>
       
       <div className="absolute top-8 left-8 z-50">
          <span className="px-4 py-1.5 bg-smash-orange text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-xl border border-smash-orange/20">
             AD
          </span>
       </div>

       <button 
         onClick={toggleMute}
         className="absolute top-8 right-8 z-50 p-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors backdrop-blur-md border border-white/10"
       >
          {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
       </button>

       <div className="relative z-10 flex flex-col items-center justify-center p-8 w-full max-w-sm text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-12"
          >
             <h2 className="text-[40px] font-studio font-bold uppercase tracking-tight mb-4 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                {ad.advertiser_name || 'Smashify'}
             </h2>
             <p className="text-xl text-smash-gray font-bold italic tracking-tight uppercase">
                {ad.title}
             </p>
          </motion.div>
          
          {/* Waveform Visualization */}
          <div className="flex items-center justify-center gap-1.5 h-16 mb-12">
             {[...Array(12)].map((_, i) => (
                <motion.div 
                   key={i}
                   animate={{ 
                      height: [16, 48, 24, 64, 32, 16],
                   }}
                   transition={{ 
                      duration: 0.8, 
                      repeat: Infinity, 
                      delay: i * 0.05,
                      ease: "easeInOut"
                   }}
                   className="w-1.5 bg-smash-orange rounded-full shadow-[0_0_10px_rgba(255,95,0,0.5)]"
                />
             ))}
          </div>
          
          <p className="text-xs font-black text-white/40 tracking-[0.3em] uppercase">
             Completing in {timeLeft}s
          </p>
       </div>

       <div className="absolute bottom-10 left-6 right-6 z-50">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white/5 backdrop-blur-2xl rounded-[32px] p-6 border border-white/10 flex items-center justify-between"
          >
             <div className="text-left">
                <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest mb-1">Skip ads forever</p>
                <p className="text-sm font-black italic text-white uppercase tracking-tight">Premium MK 2,000/month</p>
             </div>
             <button 
               onClick={() => navigate('/pricing')} 
               className="px-6 py-3 bg-white text-smash-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-smash-orange hover:text-white transition-all shadow-xl"
             >
                Upgrade
             </button>
          </motion.div>
       </div>
    </div>
  );
};

const LiveActivity = () => {
  const [toastMsg, setToastMsg] = useState<{message: string, id: number} | null>(null);

  useEffect(() => {
      const showEvent = async () => {
          const types = ['tip', 'sale', 'listener'];
          const type = types[Math.floor(Math.random() * types.length)];
          
          let message = '';
          try {
             if (type === 'tip') {
                 const { data } = await supabase.from('transactions').select('gross_amount, profiles:artist_id(stage_name, full_name)').eq('type', 'donation').order('created_at', { ascending: false }).limit(1).maybeSingle();
                 if (data) {
                     const d = data as any;
                     message = `Someone just tipped ${d.profiles?.stage_name || d.profiles?.full_name} MK ${d.gross_amount}`;
                 }
             } else if (type === 'sale') {
                 const { count } = await supabase.from('transactions').select('id', { count: 'exact' }).eq('type', 'sale').limit(100);
                 if (count) {
                     message = `${count} tracks bought on Smashify today`;
                 }
             } else {
                 message = `${Math.floor(Math.random() * 50) + 10} people are listening right now`;
             }
          } catch (e) {}

          if (message) {
              setToastMsg({ message, id: Date.now() });
              setTimeout(() => setToastMsg(null), 3000);
          }
      };

      const interval = setInterval(showEvent, 35000); // Every 35 seconds
      return () => clearInterval(interval);
  }, []);

  return (
      <AnimatePresence>
          {toastMsg && (
              <motion.div
                  key={toastMsg.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute bottom-10 left-6 z-50 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(0,255,102,0.1)] max-w-xs"
              >
                  <div className="w-2 h-2 rounded-full bg-smash-cyan animate-pulse shrink-0" />
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">{toastMsg.message}</p>
              </motion.div>
          )}
      </AnimatePresence>
  );
};

const MotoFeed: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { togglePlay } = usePlayer();
  const [songs, setSongs] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const dragY = useMotionValue(0);
  const [seenSongs, setSeenSongs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const limits = getListenerLimits(userProfile);
      
      const { data: followed } = userProfile 
         ? await supabase.from('followers').select('artist_id').eq('follower_id', userProfile.id) : { data: [] };
      const followedIds = followed?.map(f => f.artist_id) || [];

      const today = new Date().toISOString().split('T')[0];

      // 1. Featured/Trending
      const { data: featured } = await supabase.from('songs')
         .select('*, profiles!artist_id(full_name, stage_name, avatar_url, verified, subscription_tier)')
         .eq('approved', true)
         .lte('release_date', today)
         .order('plays', { ascending: false }).limit(10);

      // 2. Artists followed
      let followedSongs: any[] = [];
      if (followedIds.length > 0) {
         const { data: fs } = await supabase.from('songs')
            .select('*, profiles!artist_id(full_name, stage_name, avatar_url, verified, subscription_tier)')
            .eq('approved', true).lte('release_date', today).in('artist_id', followedIds).limit(10);
         if (fs) followedSongs = fs;
      }

      // 3. Same region
      let regionSongs: any[] = [];
      if (userProfile?.city) {
         const { data: rs } = await supabase.from('songs')
            .select('*, profiles!artist_id(full_name, stage_name, avatar_url, verified, subscription_tier)')
            .eq('approved', true).lte('release_date', today).eq('region', userProfile.city).limit(10);
         if (rs) regionSongs = rs;
      }

      const mixed: any[] = [];
      const newSeen = new Set(seenSongs);
      const addUnique = (list: any[], count: number) => {
         let added = 0;
         for (const s of list) {
            if (added >= count) break;
            if (!newSeen.has(s.id)) {
               mixed.push(s);
               newSeen.add(s.id);
               added++;
            }
         }
      };

      // 5. Snippets
      let snippets: any[] = [];
      if (limits.canAccessSnippets) {
         const { data: sn } = await supabase.from('moto_feed')
            .select('*, profiles:artist_id(full_name, stage_name, avatar_url, verified, subscription_tier)')
            .eq('approved', true)
            .limit(10);
         if (sn) snippets = sn.map(s => ({ ...s, is_snippet: true, id: `snippet-${s.id}` }));
      }

      addUnique(featured || [], 2);
      addUnique(followedSongs, 3);
      addUnique(snippets, 2);
      addUnique(regionSongs, 2);
      addUnique(featured || [], 2); // fill
      
      // Add Audio Ads every 4th card for free listeners
      if (limits.hasAds) {
        const { data: audioAds } = await supabase
          .from('audio_ads')
          .select('*')
          .eq('active', true)
          .limit(10);
        
        if (audioAds && audioAds.length > 0) {
          const validAds = audioAds.filter(a => a.plays_used < a.plays_purchased);
          if (validAds.length > 0) {
            // Inject ads every 4 spaces
            const adIndices = [];
            for (let i = 3; i < mixed.length + (mixed.length / 3); i += 4) {
               adIndices.push(i);
            }
            
            adIndices.forEach((idx, i) => {
               const ad = validAds[i % validAds.length];
               mixed.splice(idx, 0, { 
                  ...ad, 
                  is_ad: true, 
                  id: `ad-${ad.id}-${Date.now()}` // Unique ID for key
               });
            });
          }
        }
      }

      if (mixed.length < 5 && featured) {
         addUnique(featured, 10 - mixed.length);
      }

      const finalMapped = mixed.map(s => {
         if (s.is_ad) return s;
         return {
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
            cover_url: s.cover_url || (s.profiles as any)?.avatar_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&h=800&fit=crop',
            audio_url: s.audio_url || s.media_url,
            is_unreleased: !!s.media_url,
         };
      });

      setSeenSongs(newSeen);
      setSongs(prev => [...prev, ...finalMapped]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < songs.length - 1) {
      setCurrentIndex(prev => prev + 1);
      
      // Fetch more when near end
      if (currentIndex >= songs.length - 3) {
         fetchSongs();
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        if (e.key === 'ArrowUp' || e.key === 'k') handlePrev();
        if (e.key === 'ArrowDown' || e.key === 'j') handleNext();
        if (e.key === ' ') {
           e.preventDefault();
           togglePlay();
        }
        if (e.key === 'l' || e.key === 'L') {
           window.dispatchEvent(new CustomEvent('motofeed_like_trigger'));
        }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, songs.length]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.y < -100) handleNext();
    else if (info.offset.y > 100) handlePrev();
  };

  if (loading) return (
     <div className="h-screen bg-smash-black flex items-center justify-center">
        <Flame className="text-smash-orange animate-pulse" size={60} />
     </div>
  );

  if (songs.length === 0) return (
     <div className="h-screen bg-smash-black flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
           animate={{ scale: [1, 1.05, 1], rotate: [0, 180, 360] }}
           transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
           <Disc className="text-smash-gray/20 mb-8" size={120} />
        </motion.div>
        <h2 className="text-[32px] font-studio font-bold uppercase tracking-tight mb-4 text-white">The Feed is Cold</h2>
        <p className="text-smash-gray font-bold max-w-sm mx-auto mb-12">No anthems found in the warm heart today. Check back soon for fresh drops.</p>
        <div className="flex flex-col gap-4">
           <button 
             onClick={() => { setLoading(true); fetchSongs(); }}
             className="px-8 py-4 bg-white text-smash-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
           >
             <Music2 size={18} /> Refresh Feed
           </button>
           <button 
             onClick={() => navigate('/')}
             className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
           >
             Back to Home
           </button>
        </div>
        <BottomNav />
     </div>
  );

  return (
    <div className="h-[100dvh] w-screen bg-smash-black overflow-hidden touch-none flex flex-col relative">
       {/* UI Tooltips */}
       <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 pointer-events-none">
          <div className="px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-2">
             <div className="w-2 h-2 bg-smash-orange rounded-full animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">MOTO FEED LIVE</span>
          </div>
       </div>

       <div className="absolute top-1/2 left-4 md:left-12 -translate-y-1/2 z-50 flex flex-col gap-4 pointer-events-none opacity-20">
          <ArrowUp size={32} strokeWidth={3} />
          <div className="h-32 w-[2px] bg-white/20 mx-auto" />
          <ArrowDown size={32} strokeWidth={3} />
       </div>

       {songs[currentIndex] && !songs[currentIndex].is_ad && <LiveActivity />}

       <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={dragY.get() < 0 ? { y: '-100%' } : { y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            dragElastic={0.2}
            className="h-full w-full absolute inset-0 cursor-grab active:cursor-grabbing"
          >
             {songs[currentIndex]?.is_ad ? (
                <AudioAdCard ad={songs[currentIndex]} onFinish={handleNext} />
             ) : (
                <MotoCard song={songs[currentIndex]} active={true} onSkip={handleNext} />
             )}
          </motion.div>
       </AnimatePresence>
       
       {/* Sidebar for Desktop, BottomNav for Mobile */}
       <div className="hidden md:block absolute left-0 top-0 bottom-0 z-40 bg-black/50 backdrop-blur-md">
           <Sidebar isCollapsed={true} setIsCollapsed={() => {}} unreadCount={0} />
       </div>
       <BottomNav />
    </div>
  );
};

export default MotoFeed;
