const fs = require('fs');
let code = fs.readFileSync('src/components/common/FollowedArtistCard.tsx', 'utf8');

code = code.replace(
  'const { currentSong, isPlaying, playSong, playQueue } = usePlayer();',
  'const { currentSong, isPlaying, playSong, playQueue, togglePlay } = usePlayer();'
);

code = code.replace(
  'playSong(song);',
  'togglePlay();'
);

fs.writeFileSync('src/components/common/FollowedArtistCard.tsx', code);
