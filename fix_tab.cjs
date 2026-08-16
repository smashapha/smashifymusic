const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace bg-bg-surface with bg-[#1A1A1A]
content = content.replace(/bg-bg-surface/g, 'bg-[#1A1A1A]');
content = content.replace(/border-border-default/g, 'border-white/10');
content = content.replace(/bg-bg-elevated/g, 'bg-white/5');

// text-[#7878a0], text-[#505070] -> text-[#B0B0B0]
content = content.replace(/text-\[\#7878a0\]/g, 'text-[#B0B0B0]');
content = content.replace(/text-\[\#505070\]/g, 'text-[#B0B0B0]');

// #0ea5e9, #38bdf8 -> #00A3FF
content = content.replace(/#0ea5e9/g, '#00A3FF');
content = content.replace(/#38bdf8/g, '#00A3FF');

// text-[#FFAA00] -> text-[#F59E0B]
content = content.replace(/text-\[\#FFAA00\]/g, 'text-[#F59E0B]');

// text-[#00D68F] -> text-[#22C55E]
content = content.replace(/text-\[\#00D68F\]/g, 'text-[#22C55E]');

// Replace px-8 py-6 with px-4 py-3 md:px-5 for tables
content = content.replace(/px-8 py-6/g, 'px-4 py-3 md:px-5');
// Some might just be px-8 py-4 etc
content = content.replace(/px-6 py-4/g, 'px-4 py-3');

// Replace #141428, #22223e with #1A1A1A and white/10
content = content.replace(/bg-\[\#141428\]/g, 'bg-[#1A1A1A]');
content = content.replace(/border-\[\#22223e\]/g, 'border-white/10');

// Replace some specific headers in tables 
// text-[11px] font-semibold tracking-wider text-[#B0B0B0] border-b border-white/10
content = content.replace(/tracking-wider/g, 'tracking-[0.12em]');
content = content.replace(/font-semibold text-smash-gray/g, 'font-medium text-[#737373]');

fs.writeFileSync('src/pages/Admin.tsx', content);
