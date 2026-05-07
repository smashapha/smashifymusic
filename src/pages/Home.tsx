import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Flame, Music, Disc, User, ChevronRight, TrendingUp, Sparkles, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Song, Artist } from '../types';
import SongCard from '../components/common/SongCard';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [newReleases, setNewReleases] = useState<Song[]>([]);
  const [forSaleSongs, setForSaleSongs] = useState<Song[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select(`
          *,
          profiles:artist_id (
            full_name,
            stage_name,
            avatar_url,
            verified
          )
        `)
        .eq('approved', true);

      if (songsError) throw songsError;

      const formattedSongs = (songsData || []).map((s: any) => ({
        ...s,
        artist_name: s.profiles?.stage_name || s.profiles?.full_name || 'Unknown Artist',
        cover_url: s.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
        url: s.audio_url
      }));

      setTrendingSongs(formattedSongs.sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10));
      setNewReleases(formattedSongs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10));
      setForSaleSongs(formattedSongs.filter(s => s.is_for_sale).slice(0, 10));

      const { data: artistsData, error: artistsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_artist', true)
        .limit(10);

      if (artistsError) throw artistsError;
      setTopArtists(artistsData as any);
    } catch (err) {
      console.error('Error fetching home data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return (
        <div className="min-h-screen bg-smash-black flex items-center justify-center">
           <motion.div 
             animate={{ rotate: 360 }}
             transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
             className="w-12 h-12 border-4 border-smash-orange border-t-transparent rounded-full"
           />
        </div>
     );
  }

  const featured = trendingSongs[0];

  return (
    <div className="pb-32 px-4 md:px-12 pt-8">
      {/* Featured Banner */}
      {featured && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-[400px] md:h-[500px] rounded-[40px] md:rounded-[60px] overflow-hidden mb-16 group cursor-pointer"
          onClick={() => navigate(`/artist/${featured.artist_id}`)}
        >
           <img 
             src={featured.cover_url} 
             className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[10s]" 
             alt="" 
             referrerPolicy="no-referrer"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-smash-black via-smash-black/20 to-transparent" />
           <div className="absolute inset-0 bg-gradient-to-r from-smash-black/60 to-transparent" />
           
           <div className="absolute bottom-12 left-8 md:left-16 right-8 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                 <div className="px-4 py-1.5 bg-smash-orange text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl">TRENDING NOW</div>
                 <div className="flex items-center gap-2 text-sm text-white/80 font-bold">
                    <Sparkles size={14} className="text-smash-cyan" /> {(featured.plays || 0).toLocaleString()} STREAMS
                 </div>
              </div>
              <h1 className="text-5xl md:text-8xl font-black font-display italic uppercase tracking-tighter leading-none mb-6">
                 {featured.title}
              </h1>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                    <img src={featured.profiles?.avatar_url || 'https://i.pravatar.cc/100'} className="w-full h-full object-cover" alt="" />
                 </div>
                 <p className="text-2xl font-black font-display italic uppercase tracking-tight">{featured.artist_name}</p>
                 {featured.profiles?.verified && <div className="w-6 h-6 bg-smash-cyan rounded-full flex items-center justify-center"><Check size={14} className="text-black" /></div>}
              </div>
           </div>
        </motion.section>
      )}

      {/* Search Bar */}
      <div className="max-w-xl mx-auto mb-20">
         <form 
           className="relative group" 
           onSubmit={(e) => {
             e.preventDefault();
             const q = new FormData(e.currentTarget).get('q');
             if (q) navigate(`/search?q=${encodeURIComponent(q.toString())}`);
           }}
         >
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-smash-gray group-focus-within:text-smash-orange transition-colors" size={24} />
            <input 
              type="text" 
              name="q"
              placeholder="Search for artists, songs, or vibes..."
              className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-[32px] text-lg font-bold placeholder:text-smash-gray focus:outline-none focus:ring-4 focus:ring-smash-orange/20 focus:border-smash-orange/50 transition-all"
            />
         </form>
      </div>

      {/* Sections */}
      <HomeSection title="Trending Hits" icon={<Flame className="text-smash-orange" />} subtitle="The biggest tracks in the Warm Heart right now.">
         <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
            {trendingSongs.length > 0 ? trendingSongs.map(song => (
              <SongCard key={song.id} song={song} queue={trendingSongs} className="min-w-[280px] md:min-w-[320px] snap-start" />
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No trending tracks yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="New Releases" icon={<Sparkles className="text-smash-cyan" />} subtitle="Fresh drops from your favorite local superstars.">
         <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
            {newReleases.length > 0 ? newReleases.map(song => (
              <SongCard key={song.id} song={song} queue={newReleases} className="min-w-[280px] snap-start" />
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No new releases yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="For Sale" icon={<DollarSign className="text-smash-green" />} subtitle="Support artists directly by owning their music.">
         <div className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar">
            {forSaleSongs.length > 0 ? forSaleSongs.map(song => (
              <SongCard key={song.id} song={song} queue={forSaleSongs} className="min-w-[280px] snap-start" />
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No tracks for sale yet</div>
            )}
         </div>
      </HomeSection>

      <HomeSection title="Featured Artists" icon={<User className="text-white" />} subtitle="The visionaries shaping Malawian culture.">
         <div className="flex overflow-x-auto gap-8 pb-8 snap-x no-scrollbar">
            {topArtists.length > 0 ? topArtists.map(artist => (
              <motion.div 
                key={artist.id}
                whileHover={{ y: -5 }}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="flex flex-col items-center gap-4 min-w-[160px] cursor-pointer snap-start group"
              >
                 <div className="relative p-1 rounded-full bg-gradient-to-tr from-smash-orange to-smash-purple group-hover:p-1.5 transition-all">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-smash-black">
                       <img src={artist.avatar_url || 'https://i.pravatar.cc/200'} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform" alt="" />
                    </div>
                    {artist.verified && (
                       <div className="absolute bottom-1 right-1 w-8 h-8 bg-smash-cyan rounded-full border-4 border-smash-black flex items-center justify-center">
                          <Check size={16} className="text-black" />
                       </div>
                    )}
                 </div>
                 <div className="text-center">
                    <p className="font-display font-black text-lg italic uppercase truncate tracking-tight">{artist.stage_name || (artist as any).full_name || artist.name}</p>
                    <p className="text-[10px] font-black text-smash-gray uppercase tracking-widest">{artist.genre || 'Artist'}</p>
                 </div>
              </motion.div>
            )) : (
              <div className="py-12 px-8 bg-white/5 rounded-3xl border border-white/10 text-smash-gray font-bold uppercase tracking-widest text-xs">No featured artists yet</div>
            )}
         </div>
      </HomeSection>

      <div className="mt-20 bento-card bg-gradient-to-r from-smash-orange to-smash-red p-12 text-center relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
         <h2 className="text-4xl md:text-6xl font-black font-display italic uppercase tracking-tighter mb-4 relative z-10">MOTO FEED PREVIEW</h2>
         <p className="text-white/80 text-xl font-bold mb-10 max-w-xl mx-auto relative z-10">Experience the world's first swipeable music discovery feed. Discover your next favorite song in seconds.</p>
         <button 
           onClick={() => navigate('/moto-feed')}
           className="px-12 py-5 bg-white text-smash-black rounded-[24px] font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all relative z-10 shadow-2xl"
         >
            ENTERING THE FEED
         </button>
      </div>
    </div>
  );
};

const HomeSection = ({ title, subtitle, icon, children }: any) => (
  <section className="mb-20">
    <div className="flex items-center justify-between mb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <h2 className="text-3xl md:text-4xl font-black font-display italic uppercase tracking-tighter">{title}</h2>
        </div>
        <p className="text-smash-gray font-bold tracking-tight">{subtitle}</p>
      </div>
      <button className="flex items-center gap-2 text-xs font-black text-smash-gray hover:text-white uppercase tracking-widest transition-all group">
         View All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
    {children}
  </section>
);

const Check = ({ size, className }: any) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
   </svg>
);

const Compass = ({ size, className }: any) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
   </svg>
);

export default Home;
