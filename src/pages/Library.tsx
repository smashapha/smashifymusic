import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Music2, Heart, ShoppingBag, Clock, Disc, PlayCircle, Search, Info, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Song } from '../types';
import SongCard from '../components/common/SongCard';

const Library: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'purchased' | 'likes' | 'downloads'>('purchased');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (userProfile?.id) {
      fetchLibrary();
    } else {
      setLoading(false);
    }
  }, [userProfile, activeTab]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      if (activeTab === 'purchased') {
        const { data: purchases, error: pError } = await supabase
          .from('purchases')
          .select('*, songs(*, profiles!artist_id(full_name))')
          .eq('user_id', userProfile?.id);

        if (pError) throw pError;

        const formatted = (purchases || []).map((p: any) => ({
          ...p.songs,
          artist_name: p.songs?.profiles?.stage_name || p.songs?.profiles?.full_name || 'Artist',
          cover_url: p.songs?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
          url: p.songs?.audio_url,
          is_purchased: true
        }));
        setSongs(formatted as any);
      } else if (activeTab === 'likes') {
        const { data: likes, error: lError } = await supabase
          .from('likes')
          .select('*, songs(*, profiles!artist_id(full_name, stage_name))')
          .eq('user_id', userProfile?.id);

        if (lError) {
           setSongs([]); 
        } else {
           const formatted = (likes || []).map((l: any) => ({
              ...l.songs,
              artist_name: l.songs?.profiles?.stage_name || l.songs?.profiles?.full_name || 'Artist',
              cover_url: l.songs?.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
              url: l.songs?.audio_url
           }));
           setSongs(formatted as any);
        }
      } else if (activeTab === 'downloads') {
        let downloadIds: string[] = [];
        try {
          downloadIds = JSON.parse(localStorage.getItem('smash_downloads') || '[]');
        } catch (e) {
          console.error('Error parsing downloads:', e);
        }
        if (downloadIds.length > 0) {
           const { data: downloadSongs, error: dError } = await supabase
              .from('songs')
              .select('*, profiles!artist_id(full_name, stage_name)')
              .in('id', downloadIds);
           
           if (!dError && downloadSongs) {
              const formatted = downloadSongs.map((s: any) => ({
                 ...s,
                 artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Artist',
                 cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
                 url: s.audio_url
              }));
              setSongs(formatted as any);
           } else {
              setSongs([]);
           }
        } else {
           setSongs([]);
        }
      }
    } catch (err) {
      console.error('Error fetching library:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.artist_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!userProfile) {
     return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 p-12 text-center">
           <div className="relative">
              <div className="absolute inset-0 bg-smash-orange/20 blur-3xl rounded-full" />
              <div className="relative w-32 h-32 rounded-full border-4 border-dashed border-smash-gray/30 flex items-center justify-center">
                 <ShoppingBag size={48} className="text-smash-gray/30" />
              </div>
           </div>
           <div className="space-y-4">
              <h1 className="text-4xl font-black font-display italic uppercase tracking-tighter">Your Collection</h1>
              <p className="max-w-md text-smash-gray font-medium">Elevate your experience. Sign in to access your purchased beats and favorite slaps.</p>
           </div>
           <button onClick={() => window.location.href = '/auth'} className="px-12 py-5 bg-smash-orange text-white rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-smash-orange/20 hover:scale-105 transition-all">
              Sign In To Access
           </button>
        </div>
     );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
           <h1 className="text-5xl md:text-7xl font-black font-display italic uppercase tracking-tighter leading-none">
             YOUR <span className="text-smash-orange">LIBRARY</span>
           </h1>
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('purchased')}
                className={`flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'purchased' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <ShoppingBag size={18} /> Purchased ({songs.length})
              </button>
              <button 
                onClick={() => setActiveTab('likes')}
                className={`flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'likes' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Heart size={18} /> Liked Tracks
              </button>
              <button 
                onClick={() => setActiveTab('downloads')}
                className={`flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'downloads' ? 'text-smash-orange' : 'text-smash-gray hover:text-white'}`}
              >
                <Download size={18} /> Downloads
              </button>
           </div>
        </div>

        <div className="relative w-full md:w-80 group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-smash-orange transition-colors" size={20} />
           <input 
             type="text" 
             placeholder="Search library..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-white/5 border border-white/10 rounded-[24px] pl-14 pr-6 py-4 text-sm font-medium outline-none focus:border-smash-orange transition-all"
           />
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 opacity-10 pointer-events-none">
           <Disc size={300} strokeWidth={0.5} className="animate-spin-slow" />
        </div>

        {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="aspect-square bg-white/5 rounded-[24px] animate-pulse" />
             ))}
           </div>
        ) : filteredSongs.length > 0 ? (
           <div className="space-y-4">
              {filteredSongs.map((song) => (
                 <SongCard key={song.id} song={song} queue={filteredSongs} variant="list" />
              ))}
           </div>
        ) : (
           <div className="bento-card p-20 text-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                 {activeTab === 'purchased' ? <ShoppingBag size={40} className="text-smash-gray" /> : <Heart size={40} className="text-smash-gray" />}
              </div>
              <div className="space-y-2">
                 <h3 className="text-3xl font-black font-display italic uppercase tracking-tighter">Nothing Here Yet</h3>
                 <p className="text-smash-gray font-medium max-w-sm mx-auto">
                    {activeTab === 'purchased' 
                       ? "You haven't purchased any tracks yet. Support artists and own your favorite slaps!" 
                       : "Save your favorite tracks to access them quickly later."}
                 </p>
              </div>
              <button 
                onClick={() => window.location.href = '/discover'}
                className="px-8 py-4 bg-white text-smash-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-smash-orange hover:text-white transition-all shadow-xl"
              >
                Go Exploring
              </button>
           </div>
        )}
      </div>

      {/* Suggested for You Column (Only if space allows or at bottom) */}
      <div className="pt-20 border-t border-white/5 p-8 bg-gradient-to-r from-smash-orange/5 to-transparent rounded-[40px]">
         <div className="flex items-center gap-4 mb-8">
            <PlayCircle className="text-smash-orange" size={28} />
            <h2 className="text-2xl font-black font-display italic uppercase tracking-tighter">Quick Play Suggestions</h2>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
               <div className="w-14 h-14 rounded-xl bg-smash-orange flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Clock size={24} fill="white" />
               </div>
               <div>
                  <h4 className="font-display font-black italic uppercase text-lg leading-none mb-1">Recently Played</h4>
                  <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest">Jump back in</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group opacity-50">
               <div className="w-14 h-14 rounded-xl bg-smash-purple flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Music2 size={24} fill="white" />
               </div>
               <div>
                  <h4 className="font-display font-black italic uppercase text-lg leading-none mb-1">Playlists</h4>
                  <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest">Feature coming soon</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
               <div className="w-14 h-14 rounded-xl bg-smash-gray flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Info size={24} fill="white" />
               </div>
               <div>
                  <h4 className="font-display font-black italic uppercase text-lg leading-none mb-1">Library Help</h4>
                  <p className="text-[10px] text-smash-gray font-black uppercase tracking-widest">Learn how to manage</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Library;
