const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Imports
if (!code.includes('QuickPickCard')) {
  code = code.replace(
    "import FollowedArtistCard from '../components/common/FollowedArtistCard';",
    "import FollowedArtistCard from '../components/common/FollowedArtistCard';\nimport QuickPickCard from '../components/common/QuickPickCard';"
  );
}

const oldQuickPicksRegex = /<div className="grid grid-rows-3 grid-flow-col gap-x-4 gap-y-3 overflow-x-auto snap-x no-scrollbar pb-6 -mx-4 px-4 md:mx-0 md:px-0 auto-cols-\[85vw\] md:auto-cols-\[320px\]">[\s\S]*?(?=<\/section>)/;

const newQuickPicks = `<div className="grid grid-rows-4 grid-flow-col gap-x-4 gap-y-3 overflow-x-auto snap-x no-scrollbar pb-6 -mx-4 px-4 md:mx-0 md:px-0 auto-cols-[85vw] md:auto-cols-[320px]">
            {trendingSongs.map((song, idx) => (
              <QuickPickCard key={\`quick-\${song.id}\`} song={song} queue={trendingSongs} />
            ))}
          </div>
        `;

code = code.replace(oldQuickPicksRegex, newQuickPicks);

fs.writeFileSync('src/pages/Home.tsx', code);
console.log('Patched Home.tsx to use QuickPickCard with grid-rows-4');
