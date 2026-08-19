const fs = require('fs');
let code = fs.readFileSync('src/components/common/FollowedArtistCard.tsx', 'utf8');

code = code.replace(
  'className="relative w-[260px] md:w-[300px] h-[160px] md:h-[180px] rounded-[20px] overflow-hidden group cursor-pointer border border-white/10 shrink-0"',
  'className="relative w-[260px] md:w-[300px] h-[160px] md:h-[180px] rounded-[20px] overflow-hidden group cursor-pointer border border-white/10 shrink-0 snap-start"'
);

fs.writeFileSync('src/components/common/FollowedArtistCard.tsx', code);
