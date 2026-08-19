const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(
  '<HomeSection \n      \n      {followedSongs.length > 0 && (',
  '\n      {followedSongs.length > 0 && ('
);
// just to be sure, let's just do a regex replace
code = code.replace(/<HomeSection\s*\{followedSongs/g, '{followedSongs');

fs.writeFileSync('src/pages/Home.tsx', code);
