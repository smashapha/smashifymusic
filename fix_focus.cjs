const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

code = code.replace(/group hover:border-smash-orange\/30 transition-all text-left/g, "group hover:border-smash-orange/30 transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-smash-orange/50");

code = code.replace(/group hover:bg-smash-purple\/20 transition-all text-left/g, "group hover:bg-smash-purple/20 transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-smash-purple/50");

fs.writeFileSync('src/pages/Profile.tsx', code);
