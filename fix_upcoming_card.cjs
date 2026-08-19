const fs = require('fs');
let code = fs.readFileSync('src/components/common/UpcomingSongCard.tsx', 'utf8');

code = code.replace(
  'className={\\`w-full',
  'className={`w-full'
);
code = code.replace(
  '}\\`}',
  '}`}'
);

fs.writeFileSync('src/components/common/UpcomingSongCard.tsx', code);
console.log('Fixed UpcomingSongCard syntax');
