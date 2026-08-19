const fs = require('fs');
const lines = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8').split('\n');
console.log(lines.slice(2930, 2980).join('\n'));
