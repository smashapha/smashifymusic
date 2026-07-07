const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

// I will just use regex to strip out everything between "promoModalSong && (" and "{/* Mobile Sidebar Overlay */}"
// But wait, the previous script might have left a trailing brace or parenthesis.
code = code.replace(/\{promoModalSong && \([\s\S]*?\{\/\* Mobile Sidebar Overlay \*\/\}/g, "{/* Mobile Sidebar Overlay */}");
fs.writeFileSync('src/pages/ArtistHub.tsx', code);
