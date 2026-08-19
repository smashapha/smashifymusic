const fs = require('fs');
const lines = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8').split('\n');
console.log(lines.slice(3080, 3130).join('\n'));
