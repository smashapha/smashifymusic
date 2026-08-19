const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// 1. Add state for "followedArtistsSongs"
code = code.replace(
  'const [topArtists, setTopArtists] = useState<Artist[]>([]);',
  `const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [followedSongs, setFollowedSongs] = useState<Song[]>([]);`
);

// 2. Add fetch logic inside the useEffect where it fetches other things
const fetchLogic = `
      if (userProfile?.id) {
        // Fetch followed artists
        const { data: followedData } = await supabase
          .from('followers')
          .select('artist_id')
          .eq('follower_id', userProfile.id);
        
        if (followedData && followedData.length > 0) {
          const artistIds = followedData.map(f => f.artist_id);
          const { data: followedSongsData } = await supabase
            .from('public_songs')
            .select('*')
            .in('artist_id', artistIds)
            .eq('approved', true)
            .order('created_at', { ascending: false })
            .limit(10);
            
          if (followedSongsData && followedSongsData.length > 0) {
            const enrichedFollowed = await Promise.all(followedSongsData.map(async (song: any) => {
              const { data: pData } = await supabase
                .from('artist_catalog')
                .select('id, full_name, stage_name, genre, avatar_url, verified')
                .eq('id', song.artist_id)
                .single();
              return { ...song, profiles: pData || null };
            }));
            setFollowedSongs(enrichedFollowed as any);
          }
        }
      }
`;

code = code.replace(
  'const { data: artistsData, error: artistsError } = await supabase',
  fetchLogic + '\n      const { data: artistsData, error: artistsError } = await supabase'
);

// 3. Add the UI rail for "From your artists" right after "New Releases"
const uiRail = `
      {followedSongs.length > 0 && (
        <HomeSection 
          title="From Your Artists" 
          subtitle="Recent drops from artists you follow."
          onViewAll={() => navigate('/library?tab=artists')}
        >
          <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {followedSongs.map((song, i) => (
              <div 
                key={\`followed-\${song.id}-\${i}\`}
                className="w-[140px] md:w-[180px] shrink-0 snap-start"
              >
                <SongCard 
                  song={song}
                  songs={followedSongs}
                  index={i}
                />
              </div>
            ))}
          </div>
        </HomeSection>
      )}
`;

code = code.replace(
  'title="New Releases"',
  uiRail + '\n      <HomeSection \n        title="New Releases"'
);

fs.writeFileSync('src/pages/Home.tsx', code);
console.log('Home.tsx patched with followed artists rail');
