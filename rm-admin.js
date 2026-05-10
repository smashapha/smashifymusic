import fs from 'fs';

const FILE = './src/pages/ArtistHub.tsx';
let content = fs.readFileSync(FILE, 'utf-8');

const startIdx = content.indexOf('const AdminTab = () => {');
if (startIdx !== -1) {
  content = content.substring(0, startIdx);
  fs.writeFileSync(FILE, content, 'utf-8');
  console.log('AdminTab removed!');
} else {
  console.log('AdminTab not found?!');
}
