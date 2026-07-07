const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

// Find the modal code and remove it
const startIdx = code.indexOf('{promoModalSong && (');
if (startIdx !== -1) {
  // It's around line 335
  const endMarker = '      )}';
  const endIdx = code.indexOf(endMarker, startIdx);
  if (endIdx !== -1) {
    code = code.substring(0, startIdx) + code.substring(endIdx + endMarker.length);
  }
}

fs.writeFileSync('src/pages/ArtistHub.tsx', code);
