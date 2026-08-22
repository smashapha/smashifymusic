import React, { useEffect, useState } from 'react';
import { motion } from "motion/react";
import { Flame, TrendingUp, Filter, PlayCircle, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song } from '../types';
import SongCard from '../components/common/SongCard';
import { useAuth } from '../context/AuthContext';
import { getListenerLimits } from '../lib/tierUtils';
import { attachArtistProfilesToSongs } from '../lib/publicCatalog';
import SEO from '../components/common/SEO';
import { ListRowSkeleton } from '../components/common/Skeleton';

const Trending: React.FC = () => {
   const { userProfile } = useAuth();
   const [songs, setSongs] = useState<Song[]>([]);
   const [loading, setLoading] = useState(true);

   const [refreshing, setRefreshing] = useState(false);
   const startY = React.useRef(0);

   const handleTouchStart = (e: React.TouchEvent) => {
     startY.current = e.touches[0].clientY;
   };

   const handleTouchEnd = async (e: React.TouchEvent) => {
     const deltaY = e.changedTouches[0].clientY - startY.current;
     if (deltaY > 80 && window.scrollY === 0) {
       setRefreshing(true);
       await fetchTrending();
       setRefreshing(false);
     }
   };

   useEffect(() => {
      fetchTrending();
   }, []);

   const fetchTrending = async () => {
      setLoading(true);
      try {
         const limits = getListenerLimits(userProfile || null);
         
         const today = new Date().toISOString().split('T')[0];
         const { data, error } = await supabase
            .from('public_songs')
            .select('*')
            .eq('approved', true)
            .lte('release_date', today)
            .order('plays', { ascending: false })
            .limit(20);
         
         if (error) throw error;

         const withProfiles = await attachArtistProfilesToSongs(data || []);
         let formatted = withProfiles.map((s: any) => ({
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || s.artist_name || 'Artist',
            cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
            url: s.audio_url
         }));
         
         if (!limits.canAccessSnippets) {
           formatted = formatted.filter((s: any) => !s.is_unreleased);
         }
         
         setSongs(formatted as any);
      } catch (err) {
         console.error('Error fetching trending:', err);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div 
         className="space-y-12 pb-24 px-4 md:px-8 max-w-7xl mx-auto pt-6"
         onTouchStart={handleTouchStart}
         onTouchEnd={handleTouchEnd}
      >
         <SEO 
            title="Trending African Hits | Smashify Music" 
            description="Listen to the hottest African hits and trending tracks updated daily on Smashify." 
         />
         {refreshing && (
           <div className="flex justify-center -mt-8 pt-8">
             <div className="w-6 h-6 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
           </div>
         )}
         {/* Hero Header */}
         <div className="relative p-6 md:p-10 rounded-[16px] overflow-hidden bg-[#1A1A1A] border border-white/10 text-white shadow-xl">
            <div className="absolute top-0 right-0 p-6 md:p-10 opacity-5 pointer-events-none">
               <Trophy className="w-32 h-32 md:w-[180px] md:h-[180px]" strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-3">
               <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#00A3FF]/10 text-[#00A3FF] rounded-[8px]">
                     <Flame size={18} />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00A3FF]">Top Charts</span>
               </div>
               <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tight">
                  Smashify Hot 20
               </h1>
               <p className="max-w-md text-[#B0B0B0] text-sm leading-relaxed">The most played anthems in Malawi right now. Updated daily based on verified community streams.</p>
            </div>
         </div>

         {/* Chart List */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-display font-bold text-white flex items-center gap-2.5">
                     <TrendingUp className="text-[#00A3FF] shrink-0" size={20} /> Current standings
                  </h2>

                  <div className="flex items-center gap-4">
                     <button className="text-xs font-semibold text-[#737373] hover:text-white flex items-center gap-2 transition-colors">
                        <Filter size={14} /> Filter region
                     </button>
                  </div>
               </div>

               {loading ? (
                  <div role="status" aria-live="polite" className="space-y-3">
                     <span className="sr-only">Loading trending charts...</span>
                     {[...Array(5)].map((_, i) => (
                        <ListRowSkeleton key={i} showGhostNumber={true} />
                     ))}
                  </div>
               ) : (
                  <div className="space-y-3">
                     {songs.map((song, index) => (
                        <motion.div 
                          key={`trending-song-${song.id}-${index}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="group"
                        >
                           <SongCard song={song} queue={songs} />
                        </motion.div>
                     ))}
                  </div>
               )}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
               <div className="p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
                  <h3 className="text-sm font-semibold text-white border-b border-white/10 pb-3">Top Genres</h3>
                  <div className="space-y-3">
                     {['Afropop', 'Hip Hop', 'Amapiano'].map((g, i) => (
                        <div key={g} className="flex items-center justify-between">
                           <span className="text-xs font-medium text-[#B0B0B0]">{g}</span>
                           <div className="flex-1 mx-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[#00A3FF] rounded-full" style={{ width: `${80 - i * 15}%` }} />
                           </div>
                           <span className="font-mono text-xs text-[#737373]">{80 - i * 15}%</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
                  <div className="flex items-center gap-2 text-white">
                     <PlayCircle className="text-[#00A3FF]" size={18} />
                     <h3 className="text-sm font-semibold">Coming Soon</h3>
                  </div>
                  <p className="text-xs text-[#B0B0B0] leading-relaxed">Local live stream charts coming in June. Stay tuned for real-time radio charts.</p>
                  <button className="w-full py-2.5 bg-[#0084D6] hover:bg-[#0084D6]/90 text-white rounded-[10px] font-semibold text-xs transition-all">
                     Follow updates
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Trending;
