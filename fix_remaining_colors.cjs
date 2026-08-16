const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

content = content.replace(/border-yellow-500\/20/g, 'border-[#F59E0B]/20');
content = content.replace(/from-smash-purple\/10/g, 'from-[#00A3FF]/10');
content = content.replace(/shadow-smash-orange\/20/g, 'shadow-[#00A3FF]/20');
content = content.replace(/shadow-smash-orange\/30/g, 'shadow-[#00A3FF]/30');
content = content.replace(/bg-gradient-to-br from-\[\#00A3FF\]\/10 to-\[\#111118\]/g, 'bg-[#1A1A1A]'); // just use plain bg instead of gradient
content = content.replace(/bg-gradient-to-br from-\[\#00A3FF\]\/10 to-bg-bg-surface/g, 'bg-[#1A1A1A]'); 

fs.writeFileSync('src/pages/Admin.tsx', content);
