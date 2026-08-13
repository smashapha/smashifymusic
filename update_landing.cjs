const fs = require('fs');
let code = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

// 1. Imports
code = code.replace(
  `Smartphone, User, Info, Star, Play, MapPin, Wallet, PieChart`,
  `Smartphone, User, Info, Star, Play, MapPin, Wallet, PieChart, UploadCloud, Briefcase, Handshake, Banknote, Music2`
);

// 2. Fetch stats
code = code.replace(
  `const [trendingSongs, setTrendingSongs] = useState<any[]>([]);`,
  `const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [platformStats, setPlatformStats] = useState({ artists: 0, songs: 0 });`
);

code = code.replace(
  `const { data: trendingData } = await supabase.from('songs').select('id, title, artists(stage_name, full_name)').eq('approved', true).lte('release_date', today).order('plays', { ascending: false }).limit(10);
      setTrendingSongs(trendingData || []);`,
  `const { data: trendingData } = await supabase.from('songs').select('id, title, artists(stage_name, full_name)').eq('approved', true).lte('release_date', today).order('plays', { ascending: false }).limit(10);
      setTrendingSongs(trendingData || []);

      const { count: artistCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'artist').eq('is_approved', true);
      const { count: songCount } = await supabase.from('songs').select('id', { count: 'exact', head: true }).eq('approved', true);
      setPlatformStats({ artists: artistCount || 0, songs: songCount || 0 });`
);

// 3. Mobile Nav Add Artist Studio
code = code.replace(
  `<button 
                onClick={() => { navigate('/home'); setMobileMenuOpen(false); }}
                className="h-16 w-full bg-smash-orange text-white rounded-2xl font-display font-black uppercase tracking-widest shadow-xl shadow-smash-orange/20"
              >
                Sign Up Free
              </button>`,
  `<button 
                onClick={() => { navigate('/home'); setMobileMenuOpen(false); }}
                className="h-16 w-full bg-smash-orange text-white rounded-2xl font-display font-black uppercase tracking-widest shadow-xl shadow-smash-orange/20"
              >
                Sign Up Free
              </button>
              <button 
                onClick={() => { navigate('/auth/artist'); setMobileMenuOpen(false); }}
                className="h-16 w-full border border-smash-purple/30 text-smash-purple bg-smash-purple/10 rounded-2xl font-display font-black uppercase tracking-widest hover:bg-smash-purple/20 transition-colors"
              >
                Artist Studio
              </button>`
);

// 4. Hero Background
code = code.replace(
  `<section className="relative min-h-screen flex items-center pt-[72px] px-6 md:px-12 overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/music.png')] bg-[length:100px_100px] bg-repeat">`,
  `<section className="relative min-h-screen flex items-center pt-[72px] px-6 md:px-12 overflow-hidden bg-[#0A0A0D]">`
);

// 5. Trust Signals in Hero (replacing the Proudly built for grid)
// We'll update the values if we have real stats
code = code.replace(
  `{ 
                  value: 'Malawi & Africa', 
                  label: 'Proudly Built For',
                  color: 'text-white',
                  bgColor: 'bg-white/10',
                  icon: MapPin
                }`,
  `{ 
                  value: platformStats.artists > 0 ? platformStats.artists.toLocaleString() : 'Growing', 
                  label: 'Approved Artists',
                  color: 'text-white',
                  bgColor: 'bg-white/10',
                  icon: Mic2
                }`
);

code = code.replace(
  `{ 
                  value: 'Direct Payouts', 
                  label: 'Airtel Money · TNM',
                  color: 'text-smash-orange',
                  bgColor: 'bg-smash-orange/10',
                  icon: Wallet
                }`,
  `{ 
                  value: platformStats.songs > 0 ? platformStats.songs.toLocaleString() : 'Discover', 
                  label: 'Available Tracks',
                  color: 'text-smash-orange',
                  bgColor: 'bg-smash-orange/10',
                  icon: Music2
                }`
);

// 6. Now Playing Hero Card
code = code.replace(
  `<div className="absolute bottom-10 right-0 w-[200px] h-[100px] bg-[#141418]/85 backdrop-blur-xl border border-white/8 rounded-[16px] p-4 flex items-center gap-3 shadow-2xl animate-fade-in">
                   <img src={optimizeImage("https://images.unsplash.com/photo-1514525253361-bee8718a300a?w=100", 120, 120)} className="w-[60px] h-[60px] rounded-[10px] object-cover" alt="Listen" loading="lazy" decoding="async" />
                   <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-smash-orange uppercase tracking-widest mb-1">Live Now</p>
                      <p className="text-[13px] font-display font-bold text-white truncate">Top Hits 2024</p>
                      <p className="text-[10px] text-white/40 uppercase font-medium">Smashify Radio</p>
                   </div>
                </div>`,
  `{topSongs.length > 0 && (
                <div className="absolute bottom-10 right-0 w-[200px] h-[100px] bg-[#141418] border border-white/10 rounded-[16px] p-4 flex items-center gap-3 shadow-2xl animate-fade-in z-20">
                   <img src={optimizeImage(topSongs[0].cover_url || "https://placehold.co/120x120/18162C/9B5DE5?text=♪", 120, 120)} className="w-[60px] h-[60px] rounded-[10px] object-cover" alt={topSongs[0].title} loading="lazy" decoding="async" />
                   <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-smash-orange uppercase tracking-widest mb-1">Top Track</p>
                      <p className="text-[13px] font-display font-bold text-white truncate">{topSongs[0].title}</p>
                      <p className="text-[10px] text-white/50 uppercase font-medium truncate">{topSongs[0].artists?.stage_name || 'Various'}</p>
                   </div>
                </div>
                )}`
);

// 7. Emojis in How it works
code = code.replace(
  `icon: '🎵',`,
  `icon: <UploadCloud size={32} className="mx-auto text-white/80" />,`
);
code = code.replace(
  `icon: '❤️',`,
  `icon: <Headphones size={32} className="mx-auto text-white/80" />,`
);
code = code.replace(
  `icon: '💰',`,
  `icon: <Wallet size={32} className="mx-auto text-white/80" />,`
);
code = code.replace(
  `icon: '📱',`,
  `icon: <Smartphone size={32} className="mx-auto text-white/80" />,`
);
code = code.replace(
  `<div className="text-3xl mb-4">{item.icon}</div>`,
  `<div className="mb-6">{item.icon}</div>`
);
code = code.replace(
  `<p className="text-white/40 text-xs leading-relaxed">`,
  `<p className="text-white/60 text-xs leading-relaxed font-sans">`
);

// 8. Emojis in Agent
code = code.replace(
  `💼 Earn With Smashify`,
  `<Briefcase size={14} className="inline-block" /> Earn With Smashify`
);
code = code.replace(
  `emoji: '🤝',`,
  `emoji: <Handshake size={24} className="text-smash-green" />,`
);
code = code.replace(
  `emoji: '💰',`,
  `emoji: <Banknote size={24} className="text-smash-green" />,`
);
code = code.replace(
  `emoji: '📱',`,
  `emoji: <Smartphone size={24} className="text-smash-green" />,`
);
code = code.replace(
  `<div className="text-3xl mb-4">{item.emoji}</div>`,
  `<div className="w-14 h-14 rounded-2xl bg-smash-green/10 flex items-center justify-center mb-6 shadow-inner border border-smash-green/20 group-hover:scale-110 transition-transform">{item.emoji}</div>`
);
code = code.replace(
  `<div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/10 text-left">`,
  `<div key={i} className="p-8 bg-white/[0.02] rounded-[32px] border border-white/10 text-left hover:border-smash-green/30 hover:bg-white/[0.04] transition-all group shadow-sm">`
);
code = code.replace(
  `<p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>`,
  `<p className="text-white/60 text-sm leading-relaxed font-sans">{item.desc}</p>`
);
code = code.replace(
  `<h3 className="font-bold text-sm mb-2">{item.title}</h3>`,
  `<h3 className="font-studio font-bold text-lg mb-2 text-white">{item.title}</h3>`
);

// 9. Fix Typo & Copy
code = code.replace(
  `unlock the full potential of Smahify.`,
  `unlock the full potential of Smashify.`
);
code = code.replace(
  `Updated Weekly`,
  `Live Chart`
);

// 10. Replace Stock photo in Artist CTA
code = code.replace(
  `<div className="hidden lg:block w-[40%] h-[500px] relative rounded-[32px] overflow-hidden group">
               <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1000" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s]" alt="Artist Performing" loading="lazy" decoding="async" />
               <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#141418] pointer-events-none" />
            </div>`,
  `<div className="hidden lg:block w-[40%] h-[500px] relative rounded-[32px] overflow-hidden group bg-[#0A0A0D] border border-white/5 shadow-2xl">
               {artists.length > 0 ? (
                 <>
                   <img src={optimizeImage(artists[0].avatar_url, 800, 800)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s] opacity-60" alt={artists[0].stage_name || 'Featured Artist'} loading="lazy" decoding="async" />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0D] via-[#0A0A0D]/50 to-transparent pointer-events-none" />
                   <div className="absolute bottom-10 left-10 right-10 text-left z-10">
                     <p className="text-[10px] font-black text-smash-orange uppercase tracking-[0.3em] mb-2 flex items-center gap-2"><Star size={12} fill="currentColor" /> Featured Artist</p>
                     <p className="font-studio font-black italic text-4xl text-white truncate">{artists[0].stage_name || artists[0].full_name}</p>
                   </div>
                 </>
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-smash-purple/20 to-smash-orange/10 p-12 text-center">
                   <Mic2 size={80} className="text-white/20 mb-6" />
                   <p className="font-studio font-black italic text-3xl text-white/40 uppercase">Your Stage</p>
                 </div>
               )}
            </div>`
);

// 11. Consistency in py-32 vs py-24. We'll leave them as they are fine unless we see glaring differences.
// But we will update the `text-white/40` contrast.
code = code.replace(/text-white\/40/g, 'text-text-secondary');

fs.writeFileSync('src/pages/Landing.tsx', code);
