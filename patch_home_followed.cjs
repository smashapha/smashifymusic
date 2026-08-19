const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Imports
if (!code.includes('FollowedArtistCard')) {
  code = code.replace(
    "import UpcomingSongCard from '../components/common/UpcomingSongCard';",
    "import UpcomingSongCard from '../components/common/UpcomingSongCard';\nimport FollowedArtistCard from '../components/common/FollowedArtistCard';"
  );
}

const oldFollowed = `      {followedSongs.length > 0 && (
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
      )}`;

const newFollowed = `      {followedSongs.length > 0 && (
        <HomeSection 
          title="From Your Artists" 
          subtitle="Recent drops from artists you follow."
          onViewAll={() => navigate('/library?tab=artists')}
        >
          <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {followedSongs.map((song, i) => (
              <FollowedArtistCard 
                key={\`followed-\${song.id}-\${i}\`} 
                song={song} 
                queue={followedSongs} 
              />
            ))}
          </div>
        </HomeSection>
      )}`;

code = code.replace(oldFollowed, newFollowed);

fs.writeFileSync('src/pages/Home.tsx', code);
console.log('Patched Home.tsx to use FollowedArtistCard');
