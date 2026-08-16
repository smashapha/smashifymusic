const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// 1. Remove font-black, uppercase, tracking-widest (except for table headers, we'll restore them later)
content = content.replace(/\bfont-black\b/g, 'font-bold'); // replace with bold just in case, we'll refine
content = content.replace(/\buppercase\b/g, ''); 
content = content.replace(/\btracking-widest\b/g, ''); 

// 2. Fix typography
content = content.replace(/text-smash-orange/g, 'text-[#FF453A]'); // or remove
content = content.replace(/text-smash-purple/g, 'text-[#00A3FF]');
content = content.replace(/text-smash-cyan/g, 'text-[#00A3FF]');
content = content.replace(/text-smash-green/g, 'text-[#22C55E]');

content = content.replace(/bg-smash-orange/g, 'bg-[#0084D6]');
content = content.replace(/bg-smash-purple/g, 'bg-[#0084D6]');
content = content.replace(/bg-smash-cyan/g, 'bg-[#0084D6]');
content = content.replace(/bg-smash-green/g, 'bg-[#22C55E]');

content = content.replace(/border-smash-orange/g, 'border-[#00A3FF]');
content = content.replace(/border-smash-purple/g, 'border-[#00A3FF]');
content = content.replace(/border-smash-cyan/g, 'border-[#00A3FF]');
content = content.replace(/border-smash-green/g, 'border-[#22C55E]');

content = content.replace(/text-yellow-500/g, 'text-[#F59E0B]');
content = content.replace(/text-red-400/g, 'text-[#FF453A]');
content = content.replace(/text-red-500/g, 'text-[#FF453A]');
content = content.replace(/bg-yellow-500/g, 'bg-[#F59E0B]');
content = content.replace(/bg-red-400/g, 'bg-[#FF453A]');
content = content.replace(/bg-red-500/g, 'bg-[#FF453A]');

content = content.replace(/bg-\[\#0c0c10\]/g, 'bg-[#0A0A0A]');
content = content.replace(/bg-\[\#13131a\]/g, 'bg-[#1A1A1A]');

fs.writeFileSync('src/pages/Admin.tsx', content);
