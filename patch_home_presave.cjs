const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Imports
if (!code.includes('UpcomingSongCard')) {
  code = code.replace(
    "import SongCard from '../components/common/SongCard';",
    "import SongCard from '../components/common/SongCard';\nimport UpcomingSongCard from '../components/common/UpcomingSongCard';"
  );
}

// State
code = code.replace(
  'const [followedSongs, setFollowedSongs] = useState<Song[]>([]);',
  'const [followedSongs, setFollowedSongs] = useState<Song[]>([]);\n  const [upcomingSongs, setUpcomingSongs] = useState<Song[]>([]);'
);

// Fetching upcoming songs
const upcomingFetch = `
      // Fetch upcoming drops
      const { data: upcomingData } = await supabase
        .from('public_songs')
        .select('*')
        .eq('approved', true)
        .eq('is_active', true)
        .gt('release_date', today)
        .order('release_date', { ascending: true })
        .limit(10);
        
      if (upcomingData && upcomingData.length > 0) {
        const enrichedUpcoming = await attachArtistProfilesToSongs(upcomingData);
        setUpcomingSongs(enrichedUpcoming as any);
      }
`;

code = code.replace(
  '// Fetch followed artists',
  upcomingFetch + '\n\n      // Fetch followed artists'
);

// UI rail
const upcomingUI = `
      {upcomingSongs.length > 0 && (
        <HomeSection 
          overline="COMING SOON"
          title="Upcoming drops" 
          subtitle="Pre-save unreleased tracks and get notified when they drop."
        >
          <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {upcomingSongs.map((song, i) => (
              <div 
                key={\`upcoming-\${song.id}-\${i}\`}
                className="w-[160px] md:w-[180px] shrink-0 snap-start"
              >
                <UpcomingSongCard song={song} />
              </div>
            ))}
          </div>
        </HomeSection>
      )}
`;

code = code.replace(
  '{followedSongs.length > 0 && (',
  upcomingUI + '\n      {followedSongs.length > 0 && ('
);

fs.writeFileSync('src/pages/Home.tsx', code);
console.log('Home.tsx patched with upcoming rail');
