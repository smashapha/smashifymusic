const fs = require('fs');
let code = fs.readFileSync('src/components/common/UpcomingSongCard.tsx', 'utf8');

code = code.replace(
  'export default function UpcomingSongCard({ song }: { song: any }) {',
  'export default function UpcomingSongCard({ song }: { song: any; key?: React.Key }) {'
);

fs.writeFileSync('src/components/common/UpcomingSongCard.tsx', code);
console.log('Fixed UpcomingSongCard syntax');
