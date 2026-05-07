import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play, Share2, Instagram, Twitter, Music2, MapPin, Users, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Song, UserProfile } from '../types';
import SongCard from '../components/common/SongCard';
import SupportArtistModal from '../components/common/SupportArtistModal';
import { AnimatePresence } from 'motion/react';

const ArtistProfile: React.FC = () => {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const { userProfile } = useAuth();
   
   const [artist, setArtist] = useState<UserProfile | null>(null);
   const [songs, setSongs] = useState<Song[]>([]);
   const [loading, setLoading] = useState(true);

   const [isFollowing, setIsFollowing] = useState(false);
   const [followLoading, setFollowLoading] = useState(false);
   const [copied, setCopied] = useState(false);
   const [showSupportModal, setShowSupportModal] = useState(false);

   const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };
 
   useEffect(() => {
      const checkFollow = async () => {
         if (!userProfile || !id) return;
         const { data, error } = await supabase
            .from('followers')
            .select('*')
            .eq('follower_id', userProfile.id)
            .eq('artist_id', id)
            .maybeSingle();
         if (data) setIsFollowing(true);
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

            const { data: songsData, error: songsError } = await supabase
               .from('songs')
               .select('*')
               .eq('artist_id', id)
               .eq('approved', true);

            if (songsError) throw songsError;

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
         alert('Please sign in to follow artists.');
         return;
      }
      setFollowLoading(true);
      try {
         if (isFollowing) {
            const { error } = await supabase.from('followers').delete().eq('follower_id', userProfile.id).eq('artist_id', id);
            if (error) throw error;
            setIsFollowing(false);
         } else {
            const { error } = await supabase.from('followers').insert({ follower_id: userProfile.id, artist_id: id });
            if (error) throw error;
            setIsFollowing(true);
         }
      } catch (err) {
         console.error('Follow error:', err);
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

   return (
      <div className="space-y-12">
         {/* Hero Section */}
         <div className="relative h-64 md:h-96 rounded-[32px] overflow-hidden mb-16 shadow-2xl mt-4">
            <div className="absolute inset-0 bg-gradient-to-t from-smash-black via-smash-dark/80 to-transparent z-10" />
            <img src={artist.avatar_url || "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92e?w=1200&h=800&fit=crop"} alt={artist.full_name} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div className="flex items-end gap-6">
                  <div className="hidden md:block w-40 h-40 rounded-full border-4 border-smash-orange overflow-hidden shadow-xl shadow-smash-orange/20 relative top-12">
                     <img src={artist.avatar_url || "https://i.pravatar.cc/300"} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="space-y-2">
                     {artist.genre && (
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                           <Music2 size={12} /> {artist.genre}
                        </span>
                     )}
                     <h1 className="text-5xl md:text-7xl font-black font-display italic uppercase tracking-tighter drop-shadow-lg leading-none">
                        {artist.stage_name || artist.full_name || 'Unknown Artist'}
                     </h1>
                     {artist.city && (
                        <p className="flex items-center gap-2 text-smash-gray font-bold tracking-tight"><MapPin size={16} /> {artist.city}</p>
                     )}
                  </div>
               </div>
               
               <div className="flex items-center gap-4">
                  {isOwner ? (
                     <button onClick={() => navigate('/artist-hub')} className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all backdrop-blur-lg">
                        Edit Profile
                     </button>
                  ) : (
                     <>
                        <button 
                           onClick={handleFollow}
                           disabled={followLoading}
                           className={`px-8 py-4 ${isFollowing ? 'bg-white/10' : 'bg-smash-orange hover:bg-orange-600'} text-white rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-xl flex items-center gap-2`}
                        >
                           <Users size={16} /> {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button 
                           onClick={handleShare}
                           className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 border border-white/10"
                        >
                           {copied ? (
                              <><Check size={16} className="text-smash-green" /> Copied</>
                           ) : (
                              <><Share2 size={16} /> Share</>
                           )}
                        </button>
                        <button 
                           onClick={() => setShowSupportModal(true)}
                           className="px-8 py-4 bg-smash-purple hover:bg-purple-600 text-white rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-smash-purple/20 flex items-center gap-2"
                        >
                           Support Artist
                        </button>
                     </>
                  )}
               </div>
            </div>
         </div>

         {/* Content Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 ml-4">
            
            {/* Left Column - Details */}
            <div className="lg:col-span-1 space-y-8">
               <div className="bento-card p-8 space-y-6 bg-white/5">
                  <h3 className="text-xl font-black font-display italic uppercase border-b border-white/10 pb-4">About the Artist</h3>
                  {artist.bio ? (
                     <p className="text-smash-gray font-medium leading-relaxed">{artist.bio}</p>
                  ) : (
                     <p className="text-smash-gray/50 font-medium italic">No bio available yet.</p>
                  )}
                  
                  {/* Social Links */}
                  <div className="pt-4 border-t border-white/10 flex gap-4">
                     {artist.instagram && (
                        <a href={artist.instagram} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-smash-gray hover:text-white hover:bg-smash-orange transition-all">
                           <Instagram size={20} />
                        </a>
                     )}
                     {artist.twitter && (
                        <a href={artist.twitter} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-smash-gray hover:text-white hover:bg-smash-purple transition-all">
                           <Twitter size={20} />
                        </a>
                     )}
                     <button onClick={handleShare} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-smash-gray hover:text-white transition-all ml-auto relative">
                        {copied ? <Check size={20} className="text-smash-green" /> : <Share2 size={20} />}
                        {copied && (
                           <motion.span 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute -top-10 right-0 bg-smash-green text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest"
                           >
                              Copied!
                           </motion.span>
                        )}
                     </button>
                  </div>
               </div>
            </div>

            {/* Right Column - Music */}
            <div className="lg:col-span-2 space-y-8">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black font-display italic uppercase tracking-tighter">Releases</h2>
                  <p className="text-sm font-bold text-smash-gray uppercase tracking-widest">{songs.length} Tracks</p>
               </div>
               
               {songs.length > 0 ? (
                  <div className="space-y-4">
                     {songs.map(song => (
                        <SongCard key={song.id} song={song} queue={songs} variant="list" />
                     ))}
                  </div>
               ) : (
                  <div className="bento-card p-12 text-center flex flex-col items-center justify-center">
                     <Music2 size={48} className="text-smash-gray/30 mb-6" />
                     <h3 className="text-2xl font-black font-display italic uppercase mb-2 text-smash-gray">No Music Yet</h3>
                     <p className="text-smash-gray/60 font-bold max-w-sm">This artist hasn't uploaded any tracks yet.</p>
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

export default ArtistProfile;
