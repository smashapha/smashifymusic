const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

code = code.replace(
  /className="w-full h-\[120px\] md:h-\[160px\] rounded-b-\[14px\] md:rounded-\[14px\] overflow-hidden"[\s\n]*className="w-full h-full bg-gradient-to-br from-smash-orange\/20 via-smash-purple\/20 to-bg-page animate-pulse"/g,
  'className="w-full h-[120px] md:h-[160px] rounded-b-[14px] md:rounded-[14px] overflow-hidden relative bg-gradient-to-br from-smash-orange/20 via-smash-purple/20 to-bg-page animate-pulse"'
);

fs.writeFileSync('src/pages/Profile.tsx', code);
