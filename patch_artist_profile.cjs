const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistProfile.tsx', 'utf8');

// Imports
if (!code.includes('UpcomingSongCard')) {
  code = code.replace(
    "import SongCard from '../components/common/SongCard';",
    "import SongCard from '../components/common/SongCard';\nimport UpcomingSongCard from '../components/common/UpcomingSongCard';"
  );
}

// State
code = code.replace(
  'const [songs, setSongs] = useState<Song[]>([]);',
  'const [songs, setSongs] = useState<Song[]>([]);\n   const [upcomingSongs, setUpcomingSongs] = useState<Song[]>([]);'
);

// Fetch upcoming
const fetchUpcoming = `
            const { data: upcomingData } = await supabase
               .from('public_songs')
               .select('*')
               .eq('artist_id', id)
               .eq('approved', true)
               .eq('is_active', true)
               .gt('release_date', today)
               .order('release_date', { ascending: true });

            if (upcomingData && upcomingData.length > 0) {
               const formattedUpcoming = upcomingData.map((s: any) => ({
                 ...s,
                 artist_name: artistData.stage_name || artistData.full_name || 'Artist',
                 cover_url: s.cover_url || artistData.avatar_url,
                 url: s.audio_url
               }));
               setUpcomingSongs(formattedUpcoming as any);
            }
`;

code = code.replace(
  'const { data: songsData, error: songsError } = await supabase',
  fetchUpcoming + '\n            const { data: songsData, error: songsError } = await supabase'
);

// Upcoming section UI
const upcomingUI = `
            {upcomingSongs.length > 0 && (
               <section className={SECTION_SPACING}>
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                     <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-[#00A3FF] mb-1">Coming Soon</p>
                        <h2 className="text-xl md:text-2xl font-bold text-white">Upcoming Drops</h2>
                     </div>
                  </div>
                  <div className={\`grid \${GRID_ARTIST_CARDS} gap-4\`}>
                     {upcomingSongs.map(song => (
                        <UpcomingSongCard key={song.id} song={song} />
                     ))}
                  </div>
               </section>
            )}
`;

code = code.replace(
  '            {/* Discography */}',
  upcomingUI + '\n            {/* Discography */}'
);

fs.writeFileSync('src/pages/ArtistProfile.tsx', code);
console.log('ArtistProfile patched with upcoming songs');
