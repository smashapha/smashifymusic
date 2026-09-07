const fs = require('fs');
const content = fs.readFileSync('src/pages/Landing.tsx', 'utf-8');

const newContent = content.replace(
  /const fetchData = async \(\) => \{[\s\S]*?fetchData\(\);\n  \}, \[\]\);/,
  `const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [
        { data: artistsData },
        { data: topSongsData },
        { data: trendingData }
      ] = await Promise.all([
        supabase
          .from('artist_catalog')
          .select('id, full_name, stage_name, avatar_url, genre')
          .eq('user_type', 'artist')
          .not('stage_name', 'is', null)
          .limit(12),
        supabase
          .from('public_songs')
          .select('id, title, plays, cover_url, artist_id, audio_url')
          .eq('approved', true)
          .lte('release_date', today)
          .order('plays', { ascending: false })
          .limit(10),
        supabase
          .from('public_songs')
          .select('id, title, artist_id, cover_url, audio_url')
          .eq('approved', true)
          .lte('release_date', today)
          .order('plays', { ascending: false })
          .limit(10)
      ]);

      setArtists(artistsData || []);

      const [topWithProfiles, trendingWithProfiles] = await Promise.all([
        attachArtistProfilesToSongs(topSongsData || []),
        attachArtistProfilesToSongs(trendingData || [])
      ]);

      setTopSongs(topWithProfiles);
      setTrendingSongs(trendingWithProfiles);
    };
    fetchData();
  }, []);`
);

fs.writeFileSync('src/pages/Landing.tsx', newContent);
