const fs = require('fs');
let code = fs.readFileSync('src/components/common/FollowedArtistCard.tsx', 'utf8');

code = code.replace(
  'export default function FollowedArtistCard({ song, queue }: { song: Song, queue: Song[] }) {',
  'export default function FollowedArtistCard({ song, queue }: { song: Song, queue: Song[]; key?: React.Key }) {'
);

fs.writeFileSync('src/components/common/FollowedArtistCard.tsx', code);
