import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, TrendingUp, Filter, PlayCircle, Trophy, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song } from '../types';
import SongCard from '../components/common/SongCard';

const Trending: React.FC = () => {
   const [songs, setSongs] = useState<Song[]>([]);
   const [loading, setLoading] = useState(true);
   const [view, setView] = useState<'grid' | 'list'>('list');

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
         const { data, error } = await supabase
            .from('songs')
            .select('*, profiles!artist_id(full_name, stage_name)')
            .eq('approved', true)
            .order('plays', { ascending: false })
            .limit(20);
         
         if (error) throw error;

         const formatted = (data || []).map((s: any) => ({
            ...s,
            artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
            cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
            url: s.audio_url
         }));
         setSongs(formatted as any);
      } catch (err) {
         console.error('Error fetching trending:', err);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div 
         className="space-y-12 pb-24"
         onTouchStart={handleTouchStart}
         onTouchEnd={handleTouchEnd}
      >
         {refreshing && (
           <div className="flex justify-center -mt-8 pt-8">
             <div className="w-6 h-6 border-2 border-smash-orange border-t-transparent rounded-full animate-spin" />
           </div>
         )}
         {/* Hero Header */}
         <div className="relative p-12 rounded-[40px] overflow-hidden bg-gradient-to-br from-smash-orange to-smash-red text-white shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-10">
               <Trophy size={200} strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                     <Flame size={24} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.4em]">Charts</span>
               </div>
               <h1 className="text-6xl md:text-8xl font-black font-display italic uppercase tracking-tighter leading-none translate-x-[-4px]">
                  SMASHIFY <br />
                  <span className="text-smash-black font-outline text-transparent" style={{ WebkitTextStroke: '1px white' }}>HOT 20</span>
               </h1>
               <p className="max-w-md font-bold text-lg opacity-80">The most played anthems in Malawi right now. Updated daily based on community streams.</p>
            </div>
         </div>

         {/* Chart List */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-3 space-y-8">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black font-display italic uppercase tracking-tighter flex items-center gap-4">
                     <TrendingUp className="text-smash-orange" /> Current Standings
                  </h2>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                        <button 
                           onClick={() => setView('list')}
                           className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-smash-orange text-white shadow-lg' : 'text-smash-gray hover:text-white'}`}
                        >
                           <List size={18} />
                        </button>
                        <button 
                           onClick={() => setView('grid')}
                           className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-smash-orange text-white shadow-lg' : 'text-smash-gray hover:text-white'}`}
                        >
                           <LayoutGrid size={18} />
                        </button>
                     </div>
                     <button className="text-xs font-black text-smash-gray hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <Filter size={16} /> Filter Region
                     </button>
                  </div>
               </div>

               {loading ? (
                  <div className="space-y-4">
                     {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
                     ))}
                  </div>
               ) : (
                  <div className={view === 'list' ? 'space-y-4' : 'grid grid-cols-2 lg:grid-cols-3 gap-6'}>
                     {songs.map((song, index) => (
                        <motion.div 
                          key={`trending-song-${song.id}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                           <SongCard song={song} queue={songs} variant={view} />
                        </motion.div>
                     ))}
                  </div>
               )}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-8">
               <div className="bento-card p-8 bg-white/5 space-y-6">
                  <h3 className="text-xl font-black font-display italic uppercase border-b border-white/10 pb-4">Top Genere</h3>
                  <div className="space-y-4">
                     {['Afropop', 'Hip Hop', 'Amapiano'].map((g, i) => (
                        <div key={g} className="flex items-center justify-between">
                           <span className="text-sm font-bold text-smash-gray uppercase tracking-widest">{g}</span>
                           <div className="flex-1 mx-4 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-smash-orange" style={{ width: `${80 - i * 15}%` }} />
                           </div>
                           <span className="font-bold text-xs">{80 - i * 15}%</span>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="bento-card p-8 bg-smash-purple/10 border-smash-purple/20 space-y-6">
                  <div className="flex items-center gap-3">
                     <PlayCircle className="text-smash-purple" />
                     <h3 className="text-xl font-black font-display italic uppercase">Coming Up</h3>
                  </div>
                  <p className="text-sm text-smash-gray font-medium leading-relaxed">Local live stream charts coming in June. Stay tuned for the real-time radio charts.</p>
                  <button className="w-full py-4 bg-smash-purple text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-smash-purple transition-all">
                     FOLLOW UPDATES
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Trending;
