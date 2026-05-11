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
   const [topSupporters, setTopSupporters] = useState<any[]>([]);

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
            setSongs(formattedSongs);

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
         <div className="w-12 h-12 border-4 border-smash-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
   );

   if (!artist) return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center p-12 text-center">
         <Users size={80} className="text-white/10 mb-6" />
         <h1 className="text-5xl font-black font-studio uppercase italic mb-4">Artist Vault Empty</h1>
         <button onClick={() => navigate(-1)} className="px-8 py-3 bg-smash-purple text-white rounded-full font-black uppercase tracking-widest text-[10px]">Back to Discover</button>
      </div>
   );

   const isOwner = userProfile?.id === artist.id;
   const popularTracks = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
   const latestRelease = songs[0];

   return (
      <div className="space-y-12 pb-32">
         {/* Premium Cinematic Hero */}
         <div className="relative h-[650px] rounded-[64px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] mt-4 group">
            <div className="absolute inset-0 bg-gradient-to-t from-smash-black via-smash-black/40 to-transparent z-10" />
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
               <div className="absolute inset-0 bg-[#0A0A0A]/40 backdrop-blur-[2px]" />
            </motion.div>
            
            {/* Overlay Content */}
            <div className="relative z-20 h-full flex flex-col justify-end p-8 md:p-20">
               <div className="flex flex-col md:flex-row items-center md:items-end gap-12">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-48 h-48 md:w-64 md:h-64 rounded-[40px] border-[12px] border-smash-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl shrink-0 group/av"
                  >
                     <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full scale-110 group-hover/av:scale-125 transition-all duration-700" />
                  </motion.div>
                  
                  <div className="flex-1 text-center md:text-left space-y-6">
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        {artist.verified && (
                           <span className="px-5 py-2 bg-smash-cyan text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-smash-cyan/20">
                             <CheckCircle2 size={16} /> Verified
                           </span>
                        )}
                        <StatPill icon={<Users size={12}/>} value={artist.followers_count || 0} label="Followers" />
                        <StatPill icon={<Music2 size={12}/>} value={songs.length} label="Tracks" />
                        <StatPill icon={<Calendar size={12}/>} value="Est. 2024" label="Joined" />
                     </div>
                     
                     <motion.h1 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-6xl md:text-[140px] font-black font-studio italic uppercase tracking-tighter leading-[0.75] text-white drop-shadow-2xl"
                     >
                        {artist.stage_name}
                     </motion.h1>
                     
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <button 
                           onClick={handleFollow} 
                           disabled={followLoading}
                           className={`h-16 px-10 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center gap-3 active:scale-95 shadow-2xl ${
                              isFollowing 
                                 ? 'bg-white/10 backdrop-blur-md border border-white/20 text-white' 
                                 : 'bg-smash-purple text-white hover:bg-white hover:text-smash-purple'
                           }`}
                        >
                           {isFollowing ? <Check size={18} /> : <UserPlus size={18} />}
                           {isFollowing ? 'Following' : 'Follow Artist'}
                        </button>
                        <button onClick={() => setShowSupportModal(true)} className="h-16 px-8 bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-white hover:text-black transition-all flex items-center gap-2">
                           <Heart size={18} /> Support
                        </button>
                        <button onClick={handleShare} className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-3xl flex items-center justify-center hover:bg-white hover:text-black transition-all">
                           <Share size={20} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Navigation Tabs */}
         <div className="flex justify-center md:justify-start gap-4 border-b border-white/5 px-8">
            <TabButton active={activeTab === 'tracks'} onClick={() => setActiveTab('tracks')} label="Music" icon={<Music2 size={18} />} />
            <TabButton active={activeTab === 'albums'} onClick={() => setActiveTab('albums')} label="Discography" icon={<Disc size={18} />} />
            <TabButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} label="Community" icon={<Users size={18} />} />
            <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} label="Creative Bio" icon={<Info size={18} />} />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 px-4 md:px-8">
            <div className="lg:col-span-8">
               <AnimatePresence mode="wait">
                  {activeTab === 'tracks' && (
                     <motion.div key="tracks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-16">
                        {/* Featured popular tracks with Rank numbers */}
                        {popularTracks.length > 0 && (
                           <section>
                              <div className="flex items-center gap-4 mb-10">
                                 <div className="w-1.5 h-10 bg-smash-purple rounded-full" />
                                 <div>
                                    <h2 className="text-4xl font-black font-studio italic uppercase tracking-tighter">Popular <span className="text-smash-gray">Demand</span></h2>
                                    <p className="text-smash-gray text-[10px] font-black uppercase tracking-widest">Most played across platform</p>
                                 </div>
                              </div>
                              <div className="bg-white/5 border border-white/5 rounded-[48px] overflow-hidden p-6 md:p-10 space-y-2">
                                 {popularTracks.map((song, i) => (
                                    <div key={song.id} className="group relative flex items-center gap-6 p-4 rounded-3xl hover:bg-white/5 transition-all text-left">
                                       <span className="w-8 text-2xl font-studio font-black italic text-white/20 group-hover:text-smash-purple transition-colors">#{i+1}</span>
                                       <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-xl">
                                          <img src={song.cover_url} className="w-full h-full object-cover" />
                                          <button onClick={() => playQueue(popularTracks, i)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                             <Play size={24} fill="currentColor" className="text-white" />
                                          </button>
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <h4 className="text-xl font-bold truncate group-hover:text-smash-purple transition-colors">{song.title}</h4>
                                          <p className="text-xs text-smash-gray font-black uppercase tracking-widest">{song.genre}</p>
                                       </div>
                                       <div className="hidden md:flex flex-col items-end gap-1">
                                          <span className="text-xl font-studio font-black italic">{(song.plays || 0).toLocaleString()}</span>
                                          <span className="text-[8px] font-black uppercase tracking-widest text-smash-gray">Plays</span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </section>
                        )}

                        <section className="space-y-10">
                           <div className="flex items-center justify-between">
                              <h2 className="text-4xl font-black font-studio italic uppercase tracking-tighter">Collection</h2>
                              <button onClick={() => playQueue(songs, 0)} className="px-6 py-2 bg-white/5 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Play All</button>
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
                              {songs.map((song, i) => (
                                 <SongCard key={song.id} song={song} queue={songs} layout="grid" />
                              ))}
                           </div>
                        </section>
                     </motion.div>
                  )}

                  {activeTab === 'community' && (
                     <motion.div key="community" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {/* Supporters Dashboard */}
                           <section className="lg:col-span-2 p-10 bg-[#111] border border-white/5 rounded-[48px] space-y-10 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-smash-orange/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                              
                              <div className="flex items-center justify-between relative z-10">
                                 <div className="flex items-center gap-3">
                                    <Crown className="text-smash-orange" size={28} />
                                    <h3 className="text-3xl font-black font-studio uppercase italic tracking-tighter text-white">Board of <span className="text-smash-orange">Patrons</span></h3>
                                 </div>
                                 <Trophy className="text-white/20" size={32} />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                 {topSupporters.length > 0 ? topSupporters.map((s, i) => (
                                    <div key={i} className="flex items-center gap-5 p-5 bg-white/5 rounded-3xl group/item hover:bg-white/10 transition-all border border-white/5">
                                       <div className="relative">
                                          <div className="w-16 h-16 rounded-2xl border-2 border-white/10 overflow-hidden shadow-xl">
                                             <Avatar src={s.avatar_url} name={s.name} className="w-full h-full scale-110" />
                                          </div>
                                          {i < 3 && (
                                            <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#111] shadow-xl ${
                                              i === 0 ? 'bg-smash-orange text-black' : i === 1 ? 'bg-white/60 text-black' : 'bg-orange-800 text-white'
                                            }`}>
                                              {i + 1}
                                            </div>
                                          )}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <p className="font-bold text-lg truncate group-hover/item:text-smash-orange transition-colors">{s.name}</p>
                                          <div className="flex items-center gap-2">
                                             <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">Contribution</p>
                                             <p className="text-xs font-studio font-black italic text-white/80">MK {s.total.toLocaleString()}</p>
                                          </div>
                                       </div>
                                       <ArrowUpRight size={18} className="text-white/20 group-hover/item:text-white transition-colors" />
                                    </div>
                                 )) : (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[32px] space-y-4">
                                       <Users className="mx-auto text-white/10" size={48} />
                                       <p className="text-sm font-bold text-smash-gray uppercase tracking-widest">No top patrons recorded yet</p>
                                       <button onClick={() => setShowSupportModal(true)} className="text-[10px] font-black uppercase tracking-widest text-smash-purple animate-pulse">Claim the first spot &rarr;</button>
                                    </div>
                                 )}
                              </div>
                           </section>

                           {/* Fan Interaction Card */}
                           <section className="lg:col-span-1 space-y-8">
                              <div className="p-10 bg-gradient-to-br from-smash-purple/20 to-transparent border border-smash-purple/20 rounded-[48px] space-y-8 text-center md:text-left">
                                 <Zap className="text-smash-purple mx-auto md:mx-0" size={32} />
                                 <div>
                                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Fan Power Index</h3>
                                    <p className="text-sm font-bold text-smash-gray mt-1 italic">"The community is 78% active this week"</p>
                                 </div>
                                 
                                 <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                       <span className="text-smash-gray">Hype Score</span>
                                       <span className="text-white">9.2 / 10</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                       <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: '92%' }}
                                          className="h-full bg-gradient-to-r from-smash-purple to-smash-pink"
                                       />
                                    </div>
                                 </div>

                                 <button onClick={() => setShowSupportModal(true)} className="w-full py-5 bg-smash-purple text-white font-black uppercase rounded-2xl shadow-2xl shadow-smash-purple/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                                    <Sparkles size={20} /> Empower Artist
                                 </button>
                              </div>

                              <div className="p-10 bg-[#111] border border-white/5 rounded-[48px] space-y-8">
                                 <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                                    <MessageSquare size={18} className="text-smash-gray" /> Collab Space
                                 </h3>
                                 <p className="text-sm text-smash-gray font-bold leading-relaxed italic">
                                    "Open for collaboration with local producers and lyricists. Premium tier artists only."
                                 </p>
                                 <button className="text-[10px] font-black uppercase tracking-widest text-smash-purple hover:text-white transition-colors">Send Request &rarr;</button>
                              </div>
                           </section>
                        </div>

                        {/* Recent Fan Activity Feed */}
                        <section className="space-y-10">
                           <div className="flex items-center gap-4">
                              <div className="w-1.5 h-8 bg-smash-orange rounded-full" />
                              <h2 className="text-3xl font-black font-studio italic uppercase tracking-tighter">Live <span className="text-smash-gray">Activity</span></h2>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {[
                                 { user: 'Chifundo M.', action: 'loved "The Horizon"', time: '2m ago', type: 'like' },
                                 { user: 'Blessings T.', action: 'supported with MK 5,000', time: '15m ago', type: 'support' },
                                 { user: 'Tiwonge K.', action: 'bought "Summer Vibes"', time: '1h ago', type: 'sale' },
                                 { user: 'Andrew P.', action: 'joined the fan club', time: '4h ago', type: 'follow' },
                              ].map((item, i) => (
                                 <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-3xl flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                       item.type === 'support' ? 'bg-smash-green/10 text-smash-green' : 'bg-white/5 text-smash-gray'
                                    }`}>
                                       {item.type === 'support' ? <Trophy size={18} /> : <TrendingUp size={18} />}
                                    </div>
                                    <div>
                                       <p className="text-xs font-bold text-white"><span className="text-smash-purple">{item.user}</span> {item.action}</p>
                                       <p className="text-[9px] font-black uppercase tracking-widest text-smash-gray mt-1 opacity-50">{item.time}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </section>
                     </motion.div>
                  )}

                  {activeTab === 'albums' && (
                     <motion.div key="albums" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-4 gap-12">
                        {albums.map((al) => (
                           <div key={al.id} className="group cursor-pointer" onClick={() => navigate(`/discover?album=${al.id}`)}>
                              <div className="aspect-square rounded-[40px] overflow-hidden mb-6 relative shadow-2xl shadow-black/50 overflow-hidden">
                                 <img src={al.cover_url || "https://placehold.co/400"} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />
                                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-110 group-hover:scale-100">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-2xl">
                                       <Play size={24} fill="currentColor" />
                                    </div>
                                 </div>
                              </div>
                              <h3 className="text-xl font-black uppercase tracking-tight mb-1 truncate">{al.title}</h3>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-smash-gray">
                                 <Calendar size={12} /> {al.release_year} • {al.genre || 'Album'}
                              </div>
                           </div>
                        ))}
                     </motion.div>
                  )}

                  {activeTab === 'about' && (
                     <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                        <section className="bg-white/5 border border-white/5 p-12 md:p-20 rounded-[64px] space-y-10">
                           <div className="flex items-center gap-4">
                              <MessageSquare className="text-smash-purple" />
                              <h2 className="text-5xl font-black font-studio italic uppercase tracking-tighter">About {artist.stage_name}</h2>
                           </div>
                           <p className="text-2xl text-smash-gray font-medium leading-relaxed max-w-4xl italic">
                              "{artist.bio || "Crafting something legendary. Stay tuned for the official narrative."}"
                           </p>
                           <div className="flex gap-4 pt-10 border-t border-white/5">
                              {artist.instagram && <SocialLink href={artist.instagram} icon={<Instagram size={20} />} label="Instagram" />}
                              {artist.twitter && <SocialLink href={artist.twitter} icon={<Twitter size={20} />} label="X Studio" />}
                           </div>
                        </section>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>

            <aside className="lg:col-span-4 space-y-10">
               {/* Sidebar Stats */}
               <div className="p-10 bg-white/5 border border-white/5 rounded-[48px] space-y-8">
                  <div className="flex items-center justify-between">
                     <p className="text-xs font-black uppercase tracking-widest text-smash-gray">Artist Vitals</p>
                     <Flame size={18} className="text-smash-orange" />
                  </div>
                  <div className="space-y-6">
                     <div className="flex justify-between items-end border-b border-white/5 pb-6">
                        <div>
                           <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest mb-1">Monthly Reach</p>
                           <p className="text-3xl font-studio font-black italic">{(artist.followers_count || 0) * 12 + 500}+</p>
                        </div>
                        <TrendingUp size={24} className="text-smash-green mb-2" />
                     </div>
                     <div className="flex justify-between items-end border-b border-white/5 pb-6">
                        <div>
                           <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest mb-1">Total Impact</p>
                           <p className="text-3xl font-studio font-black italic">{(artist.total_plays || 0).toLocaleString()}</p>
                        </div>
                        <Music2 size={24} className="text-smash-purple mb-2" />
                     </div>
                     <div className="flex justify-between items-end">
                        <div>
                           <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest mb-1">Catalog Size</p>
                           <p className="text-3xl font-studio font-black italic">{songs.length} Tracks</p>
                        </div>
                        <Disc size={24} className="text-smash-orange mb-2" />
                     </div>
                  </div>
               </div>

               {latestRelease && (
                  <div className="bg-[#111] border border-white/5 rounded-[48px] p-10 space-y-8">
                     <p className="text-xs font-black uppercase tracking-widest text-smash-orange">Fresh Selection</p>
                     <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-2xl group cursor-pointer" onClick={() => playQueue([latestRelease], 0)}>
                        <img src={latestRelease.cover_url} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                           <Play size={64} className="text-white drop-shadow-2xl" fill="white" />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-2xl font-black uppercase tracking-tight group-hover:text-smash-purple transition-colors">{latestRelease.title}</h4>
                        <p className="text-xs font-bold text-smash-gray uppercase tracking-widest">{latestRelease.genre} Release</p>
                     </div>
                     <button onClick={() => playQueue([latestRelease], 0)} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-smash-purple hover:text-white transition-all">LISTEN NOW</button>
                  </div>
               )}

               {isOwner && (
                  <div className="p-10 bg-smash-purple/10 border border-smash-purple/20 rounded-[48px] space-y-6">
                     <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck size={18} /> Owner's Access
                     </h4>
                     <p className="text-sm font-medium text-white/60 leading-relaxed italic">"Your profile is trending in the Afropop category. Update your bio to engage more fans."</p>
                     <button onClick={() => navigate('/artist-hub')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Manage Hub &rarr;</button>
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
   <div className="px-5 py-2 bg-white/5 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
      {icon} <span className="text-white font-studio italic text-xs">{typeof value === 'number' && value > 1000 ? (value/1000).toFixed(1) + 'K' : value}</span> <span className="text-smash-gray/60">{label}</span>
   </div>
);

const TabButton = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: any }) => (
   <button 
      onClick={onClick}
      className={`relative px-8 py-6 flex items-center gap-3 font-black uppercase tracking-widest text-xs transition-all ${
         active ? 'text-white scale-105' : 'text-smash-gray hover:text-white'
      }`}
   >
      <span className={active ? 'text-smash-purple' : ''}>{icon}</span> {label}
      {active && <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-1 bg-smash-purple" />}
   </button>
);

const SocialLink = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => (
   <a href={href} target="_blank" rel="noreferrer" 
     className="px-8 py-4 bg-white/5 border border-white/10 rounded-[20px] flex items-center gap-3 font-black uppercase tracking-widest text-[10px] text-smash-gray hover:text-white hover:bg-smash-purple/20 hover:border-smash-purple/30 transition-all">
      {icon} {label}
   </a>
);

export default ArtistProfile;

