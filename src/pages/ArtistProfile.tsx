import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Share2, Instagram, Twitter, Music2, MapPin, Users, Check, 
  Crown, Heart, CheckCircle2, Disc, Trophy, Sparkles, TrendingUp,
  Calendar, Info
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
   const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'about'>('tracks');
   const [topSupporters, setTopSupporters] = useState<any[]>([]);

   const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
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
                  // Fallback handling since user_profiles might be array or single object
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
               .slice(0, 3);
            setTopSupporters(sorted);
         }
      };

      const fetchArtist = async () => {
         if (!id) return;
         setLoading(true);
         try {
            // Fetch Artist Profile
            const { data: artistData, error: artistError } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', id)
               .single();
            
            if (artistError) throw artistError;
            setArtist(artistData);
            checkFollow();
            fetchTopSupporters();

            // Fetch Tracks
            const { data: songsData, error: songsError } = await supabase
               .from('songs')
               .select('*')
               .eq('artist_id', id)
               .eq('approved', true)
               .order('created_at', { ascending: false });

            if (songsError) throw songsError;

            // Fetch Albums
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
            const { error } = await supabase.from('followers').delete().eq('follower_id', userProfile.id).eq('artist_id', id);
            if (error) throw error;
            setIsFollowing(false);
            setArtist(prev => prev ? { ...prev, followers_count: Math.max(0, (prev.followers_count || 0) - 1) } : null);
            toast.success(`Unfollowed ${artist?.stage_name || 'artist'}`);
         } else {
            const { error } = await supabase.from('followers').insert({ follower_id: userProfile.id, artist_id: id });
            if (error) throw error;
            setIsFollowing(true);
            setArtist(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
            toast.success(`Following ${artist?.stage_name || 'artist'}!`);
         }
      } catch (err: any) {
         toast.error('Error: ' + err.message);
      } finally {
         setFollowLoading(false);
      }
   };
 
   if (loading) {
      return (
         <div className="min-h-screen bg-smash-black flex justify-center items-center">
            <div className="w-12 h-12 border-4 border-smash-orange border-t-transparent rounded-full animate-spin"></div>
         </div>
      );
   }

   if (!artist) {
      return (
         <div className="min-h-[50vh] flex flex-col justify-center items-center p-12 text-center">
            <Users size={64} className="text-smash-gray opacity-30 mb-6" />
            <h1 className="text-4xl font-black font-display italic uppercase mb-4">Artist Not Found</h1>
            <button onClick={() => navigate(-1)} className="text-smash-orange font-black uppercase tracking-widest hover:underline">Go Back</button>
         </div>
      );
   }

   const isOwner = userProfile?.id === artist.id;

   const formatCompact = (num: number) => {
      if (num < 1000) return String(num);
      if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
   };

   // Sort songs by plays for popular tracks
   const popularTracks = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
   const latestRelease = songs[0];

   return (
      <div className="space-y-12 pb-24">
         {/* Hero Section */}
         <div className="relative h-auto md:h-[500px] rounded-[48px] overflow-hidden shadow-2xl mt-4 pb-8 md:pb-0 group">
            <div className="absolute inset-0 bg-gradient-to-t from-smash-black via-smash-black/40 to-transparent z-10" />
            <motion.img 
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              src={artist.banner_url || artist.avatar_url || "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92e?w=1200&h=800&fit=crop"} 
              alt={artist.full_name} 
              className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105" 
            />
            
            {/* Overlay Content */}
            <div className="relative z-20 h-full flex flex-col justify-end p-8 md:p-16">
               <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-44 h-44 md:w-56 md:h-56 rounded-full border-8 border-smash-black overflow-hidden shadow-2xl relative shrink-0"
                  >
                     <Avatar src={artist.avatar_url} name={artist.stage_name || artist.full_name} className="w-full h-full" />
                  </motion.div>
                  
                  <div className="flex-1 text-center md:text-left space-y-4">
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        {artist.verified && (
                           <span className="px-4 py-1.5 bg-smash-cyan text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                             <CheckCircle2 size={14} /> Verified Artist
                           </span>
                        )}
                        {artist.genre && (
                           <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                              {artist.genre}
                           </span>
                        )}
                        {artist.city && (
                           <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
                              <MapPin size={12} /> {artist.city}
                           </span>
                        )}
                     </div>
                     
                     <h1 className="text-5xl md:text-9xl font-black font-studio italic uppercase tracking-tighter leading-[0.8] mb-4">
                        {artist.stage_name || artist.full_name}
                     </h1>
                     
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 md:gap-12">
                        <StatItem value={formatCompact(artist.followers_count || 0)} label="Followers" />
                        <StatItem value={songs.length} label="Tracks" />
                        <StatItem value={formatCompact(artist.total_plays || 0)} label="Total Plays" />
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 w-full md:w-auto">
                     <button 
                        onClick={handleFollow} 
                        disabled={followLoading}
                        className={`w-full md:w-48 py-5 rounded-full font-black uppercase tracking-widest text-sm transition-all shadow-2xl flex items-center justify-center gap-3 ${
                           isFollowing ? 'bg-white/10 border border-white/20 text-white' : 'bg-white text-black hover:bg-smash-orange hover:text-white'
                        }`}
                     >
                        {isFollowing ? <Check size={20} /> : <Users size={20} />}
                        {isFollowing ? 'Following' : 'Follow'}
                     </button>
                     <div className="flex gap-3">
                        <button onClick={() => setShowSupportModal(true)} className="flex-1 py-4 bg-smash-purple text-white rounded-full font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-105 transition-all">
                           <Heart size={16} /> Support
                        </button>
                        <button onClick={handleShare} className="w-14 h-14 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                           <Share2 size={20} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Navigation Tabs */}
         <div className="flex justify-center border-b border-white/5">
            <TabButton active={activeTab === 'tracks'} onClick={() => setActiveTab('tracks')} label="Tracks" icon={<Music2 size={16} />} />
            <TabButton active={activeTab === 'albums'} onClick={() => setActiveTab('albums')} label="Albums" icon={<Disc size={16} />} />
            <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} label="About" icon={<Info size={16} />} />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-12">
               <AnimatePresence mode="wait">
                  {activeTab === 'tracks' && (
                     <motion.div key="tracks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                        {/* Popular Section */}
                        {popularTracks.length > 0 && (
                           <section>
                              <div className="flex items-center gap-3 mb-8">
                                 <TrendingUp className="text-smash-orange" />
                                 <h2 className="text-3xl font-black font-studio italic uppercase tracking-tighter">Most <span className="text-smash-orange">Popped</span></h2>
                              </div>
                              <div className="space-y-4">
                                 {popularTracks.map((song) => (
                                    <SongCard key={`popular-${song.id}`} song={song} queue={popularTracks} layout="list" />
                                 ))}
                              </div>
                           </section>
                        )}

                        {/* All Releases */}
                        <section>
                           <div className="flex items-center justify-between mb-8">
                              <h2 className="text-3xl font-black font-studio italic uppercase tracking-tighter">All Releases</h2>
                              <button onClick={() => playQueue(songs, 0)} className="text-[10px] font-black uppercase tracking-widest text-smash-gray hover:text-white transition-colors">Play All &rarr;</button>
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              {songs.map((song) => (
                                 <SongCard key={`all-${song.id}`} song={song} queue={songs} layout="list" />
                              ))}
                           </div>
                        </section>
                     </motion.div>
                  )}

                  {activeTab === 'albums' && (
                     <motion.div key="albums" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                        <h2 className="text-3xl font-black font-studio italic uppercase tracking-tighter mb-8">Discography</h2>
                        {albums.length > 0 ? (
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                              {albums.map((album) => (
                                 <div key={album.id} className="group cursor-pointer" onClick={() => navigate(`/discover?album=${album.id}`)}>
                                    <div className="aspect-square rounded-3xl overflow-hidden mb-4 relative shadow-2xl">
                                       <img src={album.cover_url || "https://placehold.co/400"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
                                             <Play size={20} fill="currentColor" />
                                          </div>
                                       </div>
                                    </div>
                                    <h3 className="font-black uppercase tracking-tight text-sm truncate">{album.title}</h3>
                                    <p className="text-[10px] font-bold text-smash-gray uppercase tracking-widest">{album.release_year}</p>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="p-20 bg-white/5 border border-white/5 rounded-[40px] text-center space-y-4">
                              <Disc size={48} className="mx-auto text-smash-gray/20" />
                              <p className="text-smash-gray font-bold uppercase tracking-widest">No albums released yet</p>
                           </div>
                        )}
                     </motion.div>
                  )}

                  {activeTab === 'about' && (
                     <motion.div key="about" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                        <section className="bg-white/5 border border-white/5 p-12 rounded-[48px] space-y-8">
                           <h2 className="text-4xl font-black font-studio italic uppercase tracking-tighter">The <span className="text-smash-purple">Story</span></h2>
                           <p className="text-xl text-smash-gray font-medium leading-relaxed max-w-3xl">
                              {artist.bio || "This artist is letting the music speak for itself. Check back later for their official bio."}
                           </p>
                           <div className="flex gap-4 pt-6 border-t border-white/5">
                              {artist.instagram && <SocialLink href={artist.instagram} icon={<Instagram size={20} />} label="Instagram" />}
                              {artist.twitter && <SocialLink href={artist.twitter} icon={<Twitter size={20} />} label="Twitter" />}
                           </div>
                        </section>

                        <div className="grid md:grid-cols-2 gap-8">
                           <section className="p-8 bg-smash-purple/10 border border-smash-purple/20 rounded-[32px]">
                              <Trophy className="text-smash-purple mb-4" size={32} />
                              <h3 className="text-xl font-black uppercase italic mb-2">Artist Achievements</h3>
                              <p className="text-sm font-bold text-smash-gray uppercase tracking-widest">Top 100 Artist in Malawi</p>
                           </section>
                           <section className="p-8 bg-smash-cyan/10 border border-smash-cyan/20 rounded-[32px]">
                              <Sparkles className="text-smash-cyan mb-4" size={32} />
                              <h3 className="text-xl font-black uppercase italic mb-2">Professional Grade</h3>
                              <p className="text-sm font-bold text-smash-gray uppercase tracking-widest">Smashify Verified Professional</p>
                           </section>
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-8">
               {latestRelease && (
                  <div className="bg-white/5 border border-white/5 rounded-[40px] p-8 space-y-6">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-smash-orange">Latest Drop</p>
                     <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl group cursor-pointer" onClick={() => playQueue([latestRelease], 0)}>
                        <img src={latestRelease.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <Play size={48} className="text-white" fill="currentColor" />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <h4 className="text-xl font-black uppercase tracking-tight">{latestRelease.title}</h4>
                        <p className="text-xs font-bold text-smash-gray uppercase tracking-widest">{latestRelease.genre}</p>
                     </div>
                  </div>
               )}

               <div className="bg-gradient-to-br from-smash-purple/20 to-transparent border border-smash-purple/20 rounded-[40px] p-8 text-center space-y-6">
                  <Heart size={40} className="mx-auto text-smash-purple" />
                  <h3 className="text-2xl font-black font-studio italic uppercase tracking-tighter">Support {artist.stage_name || artist.full_name}</h3>
                  <p className="text-sm font-bold text-smash-gray leading-relaxed">
                     Your support directly helps Malawian artists create more music and build their careers.
                  </p>
                  <button onClick={() => setShowSupportModal(true)} className="w-full py-4 bg-smash-purple text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-smash-purple transition-all shadow-xl shadow-smash-purple/20">
                     TIP ARTIST
                  </button>
               </div>

               {/* Top Supporters */}
               <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-smash-gray flex items-center gap-2">
                     <Crown size={14} className="text-smash-purple" /> Top Supporters
                  </h4>
                  <div className="space-y-4">
                     {topSupporters.length > 0 ? (
                        topSupporters.map((supporter, i) => (
                           <div key={i} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                                 <Avatar src={supporter.avatar_url} name={supporter.name} className="w-full h-full" />
                              </div>
                              <div className="flex-1">
                                 <p className="text-[10px] font-black uppercase tracking-tight truncate">{supporter.name}</p>
                              </div>
                              <div className="px-2 py-1 bg-smash-purple/10 rounded text-[8px] font-black text-smash-purple uppercase">MK {supporter.total.toLocaleString()}</div>
                           </div>
                        ))
                     ) : (
                        <p className="text-xs text-smash-gray text-center italic">No supporters yet.</p>
                     )}
                  </div>
                  <p className="text-[9px] text-smash-gray font-bold text-center uppercase tracking-widest italic pt-2 border-t border-white/5">Be the next to support!</p>
               </div>

               {isOwner && (
                  <div className="p-8 bg-white/5 border border-white/10 rounded-[32px] space-y-4">
                     <h4 className="text-xs font-black uppercase tracking-widest text-smash-gray flex items-center gap-2">
                        <Trophy size={14} /> Artist Insight
                     </h4>
                     <p className="text-xs font-bold leading-relaxed">Your profile is seen by an average of 1,200 listeners per week. Keep uploading to grow your stats!</p>
                     <button onClick={() => navigate('/artist-hub')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Artist Hub &rarr;</button>
                  </div>
               )}
            </div>
         </div>

         <AnimatePresence>
            {showSupportModal && artist && (
               <SupportArtistModal 
                  artist={artist} 
                  onClose={() => setShowSupportModal(false)} 
               />
            )}
         </AnimatePresence>
      </div>
   );
};

const StatItem = ({ value, label }: { value: string|number, label: string }) => (
   <div className="text-center md:text-left">
      <p className="text-2xl md:text-4xl font-black font-display italic text-white leading-none mb-1">{value}</p>
      <p className="text-[10px] uppercase font-black tracking-widest text-smash-gray/60">{label}</p>
   </div>
);

const TabButton = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) => (
   <button 
      onClick={onClick}
      className={`px-8 py-5 flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs transition-all relative ${
         active ? 'text-white' : 'text-smash-gray hover:text-white'
      }`}
   >
      {icon} {label}
      {active && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-smash-orange" />}
   </button>
);

const SocialLink = ({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) => (
   <a 
     href={href} 
     target="_blank" 
     rel="noreferrer" 
     className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 font-black uppercase tracking-widest text-[10px] text-smash-gray hover:text-white hover:bg-white/10 transition-all"
   >
      {icon} {label}
   </a>
);

export default ArtistProfile;
