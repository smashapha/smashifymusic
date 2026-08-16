const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace tab page titles
content = content.replace(/text-2xl font-bold (font-display\s*|italic\s*)+text-white/g, 'text-[22px] font-studio font-bold text-white mb-6');
content = content.replace(/text-2xl font-bold\s+text-white mb-6/g, 'text-[22px] font-studio font-bold text-white mb-6');

// Replace MK numbers to mono font
content = content.replace(/text-2xl font-bold text-\[\#FF453A\] font-display shrink-0/g, 'text-[24px] font-mono text-white shrink-0');
content = content.replace(/<span className="text-\[24px\] font-mono text-white shrink-0">(\s*)MK/g, '<span className="text-[24px] font-mono text-white shrink-0">$1MK');

// Empty states updates (match public app's pattern)
// "48-64px icon in white/5 circle + 15px title + 13px gray copy"
// Currently they look like:
// <div className="text-center py-20 bg-[#111118] border border-white/5 rounded-3xl">
//   <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-[#B0B0B0]">
//     <Icon size={32} />
//   </div>
//   <h3 className="text-lg font-bold text-white mb-2">No pending reviews</h3>
content = content.replace(/text-center py-20 bg-\[\#111118\] border border-white\/5 rounded-3xl/g, 'text-center py-20 bg-white/5 border border-white/10 rounded-[16px]');
content = content.replace(/text-lg font-bold text-white mb-2/g, 'text-[15px] font-semibold text-white mb-1');
content = content.replace(/text-sm text-\[\#B0B0B0\]/g, 'text-[13px] text-[#B0B0B0]');


fs.writeFileSync('src/pages/Admin.tsx', content);
