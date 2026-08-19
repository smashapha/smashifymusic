const fs = require('fs');
let code = fs.readFileSync('src/components/common/SongCard.tsx', 'utf8');

code = code.replace(
  'const SongMenu = ({ song, onClose, onBuy, onDownload, onAddToPlaylist, artistCanSell }: any) => {',
  'export const SongMenu = ({ song, onClose, onBuy, onDownload, onAddToPlaylist, artistCanSell }: any) => {'
);

fs.writeFileSync('src/components/common/SongCard.tsx', code);
