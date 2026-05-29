const fs = require('fs');
let content = fs.readFileSync('src/pages/AuthArtist.tsx', 'utf8');
content = content.replace('{!otpVerified ? (', '{false ? (');
fs.writeFileSync('src/pages/AuthArtist.tsx', content);
