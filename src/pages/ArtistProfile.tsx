import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Share2, Instagram, Twitter, Music2, MapPin, Users, Check, 
  Crown, Heart, CheckCircle2, Disc, Trophy, Sparkles, TrendingUp,
  Calendar, Info, Plus, UserPlus, Share, MessageSquare, Flame,
  ShieldCheck, ArrowUpRight, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Song, UserProfile, Album } from '../types';
import SongCard from '../components/common/SongCard';
import Avatar from '../components/common/Avatar';
import SupportArtistModal from '../components/common/SupportArtistModal';
import { usePlayer } from '../context/PlayerContext';
import { musicService } from '../services/musicService';

const ArtistProfile: React.FC = () => {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const { userProfile } = useAuth();
   const { playQueue } = usePlayer();
   
   const [artist, setArtist] = useState<UserProfile | null>(null);
   const [songs, setSongs] = useState<Song[]>([]);
   const [albums, setAlbums] = useState<Album[]>([]);
   const [loading, setLoading] = useState(true);

   const [isFollowing, setIsFollowing] = useState(false);
   const [followLoading, setFollowLoading] = useState(false);
   const [copied, setCopied] = useState(false);
   const [showSupportModal, setShowSupportModal] = useState(false);
   const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'community' | 'about'>('tracks');
   const [isSubscribed, setIsSubscribed] = useState(false);
   const [subscribing, setSubscribing] = useState(false);
   const [topSupporters, setTopSupporters] = useState<any[]>([]);

   const handleSubscribe = async () => {
      if (!userProfile) {
         toast.error('Please sign in to subscribe.');
         return;
      }
      if (isSubscribed) {
         toast.success('You are already subscribed!');
         return;
      }
      setSubscribing(true);
      try {
         const { startFanSubscription } = await import('../lib/paychangu');
         await startFanSubscription({ artist: artist!, fan: userProfile });
      } catch (err: any) {
         toast.error(err.message);
         setSubscribing(false);
      }
   };

   const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Profile link copied!');
      setTimeout(() => setCopied(false), 2000);
   };
 
   useEffect(() => {
      const checkFollow = async () => {
         if (!userProfile || !id) return;
         const { data } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', userProfile.id)
            .eq('artist_id', id)
            .maybeSingle();
         if (data) setIsFollowing(true);
      };

      const checkSubscription = async () => {
         if (!userProfile || !id) return;
         const { data } = await supabase
            .from('fan_subscriptions')
            .select('id, status, next_billing_at')
            .eq('fan_id', userProfile.id)
            .eq('artist_id', id)
            .maybeSingle();
         if (data && data.status === 'active' && new Date(data.next_billing_at) > new Date()) {
            setIsSubscribed(true);
         }
      };
      
      const fetchTopSupporters = async () => {
         if (!id) return;
         const { data } = await supabase
            .from('transactions')
            .select('fan_id, net_amount, user_profiles:fan_id(full_name, avatar_url)')
            .eq('artist_id', id)
            .in('type', ['donation', 'sale', 'subscription'])
            .eq('status', 'completed');
         
         if (data) {
            const supportersMap = data.reduce((acc: any, curr: any) => {
               if (!acc[curr.fan_id]) {
                  const profile = Array.isArray(curr.user_profiles) ? curr.user_profiles[0] : curr.user_profiles;
                  acc[curr.fan_id] = { 
                     name: profile?.full_name || 'Fan', 
                     avatar_url: profile?.avatar_url,
                     total: 0 
                  };
               }
               acc[curr.fan_id].total += curr.net_amount;
               return acc;
            }, {});
            
            const sorted = Object.values(supportersMap)
               .sort((a: any, b: any) => b.total - a.total)
               .slice(0, 10);
            setTopSupporters(sorted);
         }
      };

      const fetchArtist = async () => {
         if (!id) return;
         setLoading(true);
         try {
            const { data: artistData, error: artistError } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', id)
               .single();
            
            if (artistError) throw artistError;
            setArtist(artistData);
            checkFollow();
            checkSubscription();
            fetchTopSupporters();

            const { data: songsData, error: songsError } = await supabase
               .from('songs')
               .select('*')
               .eq('artist_id', id)
               .eq('approved', true)
               .order('created_at', { ascending: false });

            if (songsError) throw songsError;

            const { data: albumsData } = await supabase
               .from('albums')
               .select('*')
               .eq('artist_id', id)
               .order('release_year', { ascending: false });

            setAlbums(albumsData || []);

            const formattedSongs = (songsData || []).map((s: any) => ({
               ...s,
               artist_name: artistData.stage_name || artistData.full_name || 'Artist',
               cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
               url: s.audio_url,
               profiles: artistData
             }));
            
            const enriched = await musicService.enrichSongsWithPurchases(formattedSongs as any, userProfile?.id);
            setSongs(enriched);

         } catch (err) {
            console.error('Error fetching artist:', err);
         } finally {
            setLoading(false);
         }
      };

      fetchArtist();
   }, [id, userProfile]);

   const handleFollow = async () => {
      if (!userProfile) {
         toast.error('Please sign in to follow artists.');
         return;
      }
      setFollowLoading(true);
      try {
         if (isFollowing) {
            await supabase.from('followers').delete().eq('follower_id', userProfile.id).eq('artist_id', id);
            setIsFollowing(false);
            setArtist(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
            toast.success(`Unfollowed ${artist?.stage_name}`);
         } else {
            await supabase.from('followers').insert({ follower_id: userProfile.id, artist_id: id });
            setIsFollowing(true);
            setArtist(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
            toast.success(`Following ${artist?.stage_name}!`);
         }
      } catch (err: any) {
         toast.error(err.message);
      } finally {
         setFollowLoading(false);
      }
   };
 
   if (loading) return (
      <div className="min-h-screen bg-smash-black flex justify-center items-center">
         <div className="w-10 h-10 border-4 border-smash-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
   );

    if (!artist) return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center p-8 text-center">
         <Users size={48} className="text-text-muted/30 mb-6" />
         <h1 className="text-2xl font-bold font-display uppercase tracking-tight text-text-primary mb-4">Artist Vault Empty</h1>
         <button onClick={() => navigate(-1)} className="h-[44px] px-6 bg-smash-purple text-white rounded-[10px] font-display font-semibold uppercase tracking-widest text-[11px] hover:bg-smash-purple/90 transition-colors">Back to Discover</button>
      </div>
   );

   const isOwner = userProfile?.id === artist.id;
   const popularTracks = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
   const latestRelease = songs[0];

   return (
      <div className="space-y-8 md:space-y-12 pb-32">
         {/* Premium Cinematic Hero */}
         <div className="relative h-[420px] md:h-[650px] overflow-hidden shadow-lg mt-0 md:mt-4 group md:rounded-[20px]">
            <div className="absolute inset-0 bg-gradient-to-t from-bg-page via-bg-page/40 to-transparent z-10" />
            <motion.div 
               initial={{ scale: 1.15, opacity: 0 }}
               animate={{ scale: 1, opacity: 0.8 }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="absolute inset-0"
            >
               <img 
                 src={artist.banner_url || artist.avatar_url || "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92e?w=1200&h=800&fit=crop"} 
                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
                 alt=""
               />
               <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
            </motion.div>
            
            {/* Overlay Content */}
            <div className="relative z-20 h-full flex flex-col justify-end p-5 md:p-12 lg:p-20">
               <div className="flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-12">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-24 h-24 md:w-56 md:h-56 rounded-full border-4 md:border-[8px] border-bg-page/40 backdrop-blur-md overflow-hidden shadow-xl shrink-0 group/av"
                  >
                     <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full scale-110 group-hover/av:scale-110 transition-all duration-700 object-cover" />
                  </motion.div>
                  
                  <div className="flex-1 text-center md:text-left space-y-3 md:space-y-5">
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                        {artist.verified && (
                           <span className="px-2 py-0.5 bg-smash-cyan/10 text-smash-cyan border border-smash-cyan/20 rounded-full text-[8px] md:text-[10px] font-display font-semibold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                             <CheckCircle2 size={10} className="md:w-3 md:h-3" /> Verified
                           </span>
                        )}
                        <StatPill icon={<Users size={12}/>} value={artist.followers_count || 0} label="Fans" />
                        <StatPill icon={<Music2 size={12}/>} value={songs.length} label="Tracks" />
                     </div>
                     
                     <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[32px] md:text-[clamp(48px,8vw,130px)] font-studio font-black uppercase tracking-tighter leading-[0.9] text-white drop-shadow-xl"
                     >
                        {artist.stage_name}
                     </motion.h1>
                     
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 pt-1">
                        <button 
                           onClick={handleFollow} 
                           disabled={followLoading}
                           className={`h-[40px] md:h-[44px] px-5 md:px-6 rounded-[8px] md:rounded-[10px] font-studio font-bold uppercase tracking-widest text-[10px] md:text-[12px] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm ${
                              isFollowing 
                                 ? 'bg-bg-elevated border border-border-default text-text-primary hover:bg-border-default' 
                                 : 'bg-smash-orange text-white hover:bg-smash-orange/90'
                           }`}
                        >
                           {isFollowing ? <Check size={14} className="md:w-4 md:h-4" /> : <UserPlus size={14} className="md:w-4 md:h-4" />}
                           {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        
                        {(artist?.subscription_price || 0) >= 500 && (
                           <button 
                              onClick={handleSubscribe} 
                              disabled={subscribing}
                              className={`h-[40px] md:h-[44px] px-5 md:px-6 rounded-[8px] md:rounded-[10px] font-studio font-bold uppercase tracking-widest text-[10px] md:text-[12px] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm ${
                                 isSubscribed 
                                    ? 'bg-smash-purple/20 border border-smash-purple/30 text-smash-purple cursor-default' 
                                    : 'bg-smash-purple text-white hover:bg-smash-purple/90'
                              }`}
                           >
                              {isSubscribed ? <Check size={14} className="md:w-4 md:h-4" /> : <Sparkles size={14} className="md:w-4 md:h-4" />}
                              {isSubscribed ? 'VIP Member' : 'Join VIP'}
                           </button>
                        )}

                        <button onClick={() => setShowSupportModal(true)} className="h-[40px] md:h-[44px] px-5 md:px-6 bg-bg-elevated/80 backdrop-blur-md border border-border-default text-text-primary rounded-[8px] md:rounded-[10px] font-display font-semibold uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-bg-elevated hover:text-smash-orange transition-all flex items-center gap-2">
                           <Heart size={14} className="text-smash-orange md:w-4 md:h-4" /> Support
                        </button>
                        <button onClick={handleShare} className="w-[40px] h-[40px] md:w-[44px] md:h-[44px] bg-bg-elevated/80 backdrop-blur-md border border-border-default text-text-primary rounded-[8px] md:rounded-[10px] flex items-center justify-center hover:bg-bg-elevated transition-colors">
                           <Share size={16} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Navigation Tabs */}
         <div className="flex justify-start gap-2 border-b border-border-default pb-4 overflow-x-auto no-scrollbar px-4 md:px-0">
            <TabButton active={activeTab === 'tracks'} onClick={() => setActiveTab('tracks')} label="Music" icon={<Music2 size={16} />} />
            <TabButton active={activeTab === 'albums'} onClick={() => setActiveTab('albums')} label="Discography" icon={<Disc size={16} />} />
            <TabButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} label="Community" icon={<Users size={16} />} />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 px-4 md:px-0">
            <div className="lg:col-span-8">
               <AnimatePresence mode="wait">
                  {activeTab === 'tracks' && (
                     <motion.div key="tracks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 md:space-y-12">
                        {/* Featured popular tracks with Rank numbers */}
                        {popularTracks.length > 0 && (
                           <section>
                              <div className="flex items-center gap-3 mb-5 md:mb-6">
                                 <div className="w-[3px] md:w-[4px] h-[20px] md:h-[24px] bg-smash-purple rounded-full" />
                                 <div>
                                    <h2 className="text-lg md:text-[22px] font-studio font-bold uppercase tracking-tight text-white">Popular Demand</h2>
                                    <p className="text-text-muted text-[9px] md:text-[11px] font-display font-medium uppercase tracking-widest">Most played across platform</p>
                                 </div>
                              </div>
                              <div className="bg-bg-surface border border-border-default rounded-[12px] md:rounded-[14px] overflow-hidden p-4 md:p-6 space-y-1 md:space-y-2 shadow-sm">
                                 {popularTracks.map((song, i) => (
                                    <div key={song.id} className="group relative flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-[10px] hover:bg-white/5 transition-all text-left">
                                       <span className="w-5 md:w-6 text-xs md:text-[14px] font-display font-normal text-text-muted/40 transition-colors">{i+1}</span>
                                       <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-[8px] md:rounded-[10px] overflow-hidden shrink-0 shadow-sm">
                                          <img src={song.cover_url} className="w-full h-full object-cover" />
                                          <button onClick={() => playQueue(popularTracks, i)} className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                             <Play size={16} className="text-white md:w-5 md:h-5" fill="currentColor" />
                                          </button>
                                       </div>
                                       <div className="flex-1 min-w-0 flex flex-col justify-center">
                                          <h4 className="text-xs md:text-[14px] font-display font-semibold text-text-primary truncate group-hover:text-smash-purple transition-colors">{song.title}</h4>
                                          <p className="text-[10px] md:text-[12px] text-text-muted font-sans truncate">{song.genre}</p>
                                       </div>
                                       <div className="flex flex-col items-end justify-center">
                                          <span className="text-xs md:text-[14px] font-sans font-semibold text-text-primary">{(song.plays || 0).toLocaleString()}</span>
                                          <span className="text-[9px] md:text-[11px] font-sans text-text-muted">Plays</span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </section>
                        )}

                        <section className="space-y-5 md:space-y-6">
                           <div className="flex items-center justify-between">
                              <h2 className="text-lg md:text-[22px] font-studio font-bold uppercase tracking-tight text-white">Collection</h2>
                              <button onClick={() => playQueue(songs, 0)} className="h-[32px] md:h-[36px] px-4 md:px-5 bg-bg-elevated border border-border-default text-text-primary rounded-[8px] md:rounded-[10px] text-[9px] md:text-[11px] font-display font-semibold uppercase tracking-widest hover:bg-border-default transition-all shadow-sm">Play All</button>
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                              {songs.map((song, i) => (
                                 <SongCard key={song.id} song={song} queue={songs} layout="grid" />
                              ))}
                           </div>
                        </section>
                     </motion.div>
                  )}

                  {activeTab === 'community' && (
                     <motion.div key="community" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 md:space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                           {/* Supporters Dashboard */}
                           <section className="xl:col-span-2 p-5 md:p-10 bg-bg-surface border border-border-default rounded-[12px] md:rounded-[14px] space-y-6 md:space-y-8 relative overflow-hidden group shadow-sm min-h-[300px]">
                              <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-smash-orange/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                              
                              <div className="flex items-center justify-between relative z-10">
                                 <div className="flex items-center gap-3">
                                    <Crown className="text-smash-orange w-5 h-5 md:w-6 md:h-6" />
                                    <h2 className="text-lg md:text-[22px] font-studio font-bold uppercase tracking-tight text-white">Board of <span className="text-smash-orange">Patrons</span></h2>
                                 </div>
                                 <Trophy className="text-text-muted/30 w-5 h-5 md:w-6 md:h-6" />
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 relative z-10">
                                 {topSupporters.length > 0 ? topSupporters.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-bg-elevated rounded-[10px] group/item hover:border-border-subtle transition-all border border-border-default">
                                       <div className="relative">
                                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-border-default overflow-hidden shadow-sm">
                                             <Avatar src={s.avatar_url} name={s.name} className="w-full h-full scale-110 object-cover" />
                                          </div>
                                          {i < 3 && (
                                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-display font-bold border-2 border-bg-elevated shadow-sm ${
                                              i === 0 ? 'bg-smash-orange text-white' : i === 1 ? 'bg-white/90 text-black' : 'bg-orange-800 text-white'
                                            }`}>
                                              {i + 1}
                                            </div>
                                          )}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <p className="font-display font-semibold text-xs md:text-[14px] text-text-primary truncate group-hover/item:text-smash-orange transition-colors">{s.name}</p>
                                          <div className="flex flex-col mt-0.5">
                                             <p className="text-[8px] md:text-[10px] font-display font-medium text-text-muted uppercase tracking-wider">Contribution</p>
                                             <p className="text-[10px] md:text-[12px] font-sans font-semibold text-text-secondary">MK {s.total.toLocaleString()}</p>
                                          </div>
                                       </div>
                                       <ArrowUpRight size={14} className="text-text-muted group-hover/item:text-text-primary transition-colors md:w-4 md:h-4" />
                                    </div>
                                 )) : (
                                    <div className="col-span-full py-12 md:py-16 text-center border border-dashed border-border-default rounded-[10px] space-y-3">
                                       <Users className="mx-auto text-text-muted/30" size={28} />
                                       <p className="text-xs font-sans text-text-secondary">No top patrons recorded yet</p>
                                       <button onClick={() => setShowSupportModal(true)} className="text-[10px] font-display font-semibold uppercase tracking-widest text-smash-purple hover:underline">Claim spot &rarr;</button>
                                    </div>
                                 )}
                              </div>
                           </section>

                           {/* Fan Interaction Card */}
                           <section className="xl:col-span-1 space-y-6">
                              <div className="p-6 md:p-8 bg-gradient-to-br from-smash-purple/10 to-transparent border border-smash-purple/20 rounded-[14px] space-y-6 text-center md:text-left shadow-sm">
                                 <Zap className="text-smash-purple mx-auto md:mx-0" size={28} />
                                 <div>
                                    <h3 className="text-[20px] font-display font-bold uppercase tracking-tight text-text-primary">Fan Power Index</h3>
                                    <p className="text-[13px] font-sans text-text-secondary mt-1">"The community is 78% active this week"</p>
                                 </div>
                                 
                                 <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-display font-semibold uppercase tracking-wider">
                                       <span className="text-text-muted">Hype Score</span>
                                       <span className="text-text-primary">9.2 / 10</span>
                                    </div>
                                    <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden border border-border-default">
                                       <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: '92%' }}
                                          className="h-full bg-gradient-to-r from-smash-purple to-smash-pink"
                                       />
                                    </div>
                                 </div>

                                 <button onClick={() => setShowSupportModal(true)} className="w-full h-[44px] bg-smash-purple text-white font-display font-semibold uppercase tracking-widest text-[11px] rounded-[10px] shadow-sm hover:bg-smash-purple/90 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Sparkles size={16} /> Empower Artist
                                 </button>
                              </div>

                              <div className="p-6 md:p-8 bg-bg-surface border border-border-default rounded-[14px] space-y-6 shadow-sm">
                                 <h3 className="text-[18px] font-display font-bold uppercase tracking-tight text-text-primary flex items-center gap-2">
                                    <MessageSquare size={16} className="text-text-muted" /> Collab Space
                                 </h3>
                                 <p className="text-[13px] text-text-secondary font-sans leading-relaxed">
                                    "Open for collaboration with local producers and lyricists. Premium tier artists only."
                                 </p>
                                 <button className="text-[11px] font-display font-semibold uppercase tracking-widest text-smash-purple hover:text-text-primary transition-colors">Send Request &rarr;</button>
                              </div>
                           </section>
                        </div>

                        {/* Recent Fan Activity Feed */}
                        <section className="space-y-6">
                           <div className="flex items-center gap-3">
                              <div className="w-[4px] h-[20px] bg-smash-orange rounded-full" />
                              <h2 className="text-[20px] font-display font-bold uppercase tracking-tight text-text-primary">Live <span className="text-smash-gray">Activity</span></h2>
                           </div>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                              {[
                                 { user: 'Chifundo M.', action: 'loved "The Horizon"', time: '2m ago', type: 'like' },
                                 { user: 'Blessings T.', action: 'supported with MK 5,000', time: '15m ago', type: 'support' },
                                 { user: 'Tiwonge K.', action: 'bought "Summer Vibes"', time: '1h ago', type: 'sale' },
                                 { user: 'Andrew P.', action: 'joined the fan club', time: '4h ago', type: 'follow' },
                              ].map((item, i) => (
                                 <div key={i} className="p-4 bg-bg-surface border border-border-default rounded-[10px] flex items-center gap-3 shadow-sm">
                                    <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border ${
                                       item.type === 'support' ? 'bg-smash-green/10 text-smash-green border-smash-green/20' : 'bg-bg-elevated text-text-secondary border-border-default'
                                    }`}>
                                       {item.type === 'support' ? <Trophy size={14} /> : <TrendingUp size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-[12px] font-sans text-text-primary truncate"><span className="font-semibold text-smash-purple">{item.user}</span> {item.action}</p>
                                       <p className="text-[10px] font-sans text-text-muted mt-0.5">{item.time}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </section>
                     </motion.div>
                  )}

                  {activeTab === 'albums' && (
                     <motion.div key="albums" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {albums.map((al) => (
                           <div key={al.id} className="group cursor-pointer flex flex-col" onClick={() => navigate(`/discover?album=${al.id}`)}>
                              <div className="aspect-square rounded-[10px] overflow-hidden mb-3 relative shadow-sm border border-border-default">
                                 <img src={al.cover_url || "https://placehold.co/400"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-110 group-hover:scale-100">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg">
                                       <Play size={20} fill="currentColor" />
                                    </div>
                                 </div>
                              </div>
                              <h3 className="text-[14px] font-display font-semibold text-text-primary truncate mb-1">{al.title}</h3>
                              <div className="flex items-center gap-2 text-[11px] font-display font-medium uppercase tracking-wider text-text-muted">
                                 <Calendar size={12} /> {al.release_year} • {al.genre || 'Album'}
                              </div>
                           </div>
                        ))}
                     </motion.div>
                  )}
               </AnimatePresence>

               {/* About Section moved to bottom card */}
               <section className="bg-bg-surface border border-border-default p-8 md:p-12 rounded-[14px] space-y-8 shadow-sm mt-12">
                  <div className="flex items-center gap-3">
                     <MessageSquare className="text-smash-purple" size={24} />
                     <h2 className="text-[22px] font-studio font-bold uppercase tracking-tight text-white">About {artist.stage_name}</h2>
                  </div>
                  <p className="text-[14px] text-text-secondary font-sans leading-relaxed max-w-3xl">
                     "{artist.bio || "Crafting something legendary. Stay tuned for the official narrative."}"
                  </p>
                  <div className="flex gap-3 pt-8 border-t border-border-default flex-wrap">
                     {artist.instagram && <SocialLink href={artist.instagram} icon={<Instagram size={16} />} label="Instagram" />}
                     {artist.twitter && <SocialLink href={artist.twitter} icon={<Twitter size={16} />} label="X Studio" />}
                  </div>
               </section>
            </div>

            <aside className="lg:col-span-4 space-y-8">
               {/* Sidebar Stats */}
               <div className="p-6 md:p-8 bg-bg-surface border border-border-default rounded-[14px] space-y-6 shadow-sm">
                  <div className="flex items-center justify-between">
                     <p className="text-[11px] font-display font-medium uppercase tracking-wider text-text-muted">Artist Vitals</p>
                     <Flame size={16} className="text-smash-orange" />
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-end border-b border-border-default pb-4">
                        <div className="flex flex-col">
                           <p className="text-[10px] font-display font-medium text-text-muted uppercase tracking-widest mb-0.5">Monthly Reach</p>
                           <p className="text-[20px] font-display font-bold text-text-primary">{(artist.followers_count || 0) * 12 + 500}+</p>
                        </div>
                        <TrendingUp size={18} className="text-smash-green mb-1" />
                     </div>
                     <div className="flex justify-between items-end border-b border-border-default pb-4">
                        <div className="flex flex-col">
                           <p className="text-[10px] font-display font-medium text-text-muted uppercase tracking-widest mb-0.5">Total Impact</p>
                           <p className="text-[20px] font-display font-bold text-text-primary">{(artist.total_plays || 0).toLocaleString()}</p>
                        </div>
                        <Music2 size={18} className="text-smash-purple mb-1" />
                     </div>
                     <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                           <p className="text-[10px] font-display font-medium text-text-muted uppercase tracking-widest mb-0.5">Catalog Size</p>
                           <p className="text-[20px] font-display font-bold text-text-primary">{songs.length} Tracks</p>
                        </div>
                        <Disc size={18} className="text-smash-orange mb-1" />
                     </div>
                  </div>
               </div>

               {latestRelease && (
                  <div className="bg-bg-surface border border-border-default rounded-[14px] p-6 lg:p-8 space-y-6 shadow-sm">
                     <p className="text-[11px] font-display font-medium uppercase tracking-wider text-smash-orange mb-2">Fresh Selection</p>
                     <div className="relative aspect-square rounded-[10px] overflow-hidden shadow-sm group cursor-pointer border border-border-default" onClick={() => playQueue([latestRelease], 0)}>
                        <img src={latestRelease.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <Play size={40} className="text-white drop-shadow-md" fill="white" />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-[18px] font-display font-bold uppercase tracking-tight text-text-primary group-hover:text-smash-purple transition-colors truncate">{latestRelease.title}</h4>
                        <p className="text-[12px] font-sans font-medium text-text-muted">{latestRelease.genre} Release</p>
                     </div>
                     <button onClick={() => playQueue([latestRelease], 0)} className="w-full h-[40px] bg-bg-elevated border border-border-default text-text-primary rounded-[10px] font-display font-semibold uppercase tracking-widest text-[11px] hover:bg-border-default transition-all shadow-sm">LISTEN NOW</button>
                  </div>
               )}

               {isOwner && (
                  <div className="p-6 md:p-8 bg-smash-purple/10 border border-smash-purple/20 rounded-[14px] space-y-4 shadow-sm">
                     <h4 className="text-[13px] font-display font-semibold uppercase tracking-widest flex items-center gap-2 text-smash-purple">
                        <ShieldCheck size={16} /> Owner's Access
                     </h4>
                     <p className="text-[13px] font-sans text-text-secondary leading-relaxed">"Your profile is trending in the Afropop category. Update your bio to engage more fans."</p>
                     <button onClick={() => navigate('/artist-hub')} className="w-full h-[40px] bg-bg-elevated border border-border-default text-text-primary rounded-[10px] font-display font-semibold uppercase tracking-widest text-[11px] hover:bg-border-default hover:text-text-primary transition-all shadow-sm">Manage Hub &rarr;</button>
                  </div>
               )}
            </aside>
         </div>

         <AnimatePresence>
            {showSupportModal && artist && (
               <SupportArtistModal artist={artist} onClose={() => setShowSupportModal(false)} />
            )}
         </AnimatePresence>
      </div>
   );
};

const StatPill = ({ icon, value, label }: { icon: any, value: string|number, label: string }) => (
   <div className="px-3 py-1 bg-bg-elevated backdrop-blur-md rounded-full text-[11px] font-display font-semibold uppercase tracking-wider border border-border-default flex items-center gap-1.5 text-text-primary">
      {icon} <span className="font-sans font-semibold text-[13px]">{typeof value === 'number' && value >= 1000 ? (value/1000).toFixed(1) + 'K' : value}</span> <span className="text-text-muted">{label}</span>
   </div>
);

const TabButton = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: any }) => (
   <button 
      onClick={onClick}
      className={`relative px-4 py-3 flex items-center gap-2 font-display font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap transition-all ${
         active ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
      }`}
   >
      <span className={active ? 'text-smash-purple' : ''}>{icon}</span> {label}
      {active && <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-[2px] bg-smash-purple" />}
   </button>
);

const SocialLink = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => (
   <a href={href} target="_blank" rel="noreferrer" 
     className="px-6 py-3 bg-bg-surface border border-border-default rounded-[10px] flex items-center gap-2 font-display font-semibold uppercase tracking-widest text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated hover:border-smash-purple/30 transition-all shadow-sm">
      {icon} {label}
   </a>
);

export default ArtistProfile;

