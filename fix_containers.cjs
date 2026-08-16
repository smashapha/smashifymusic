const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace standard tab content container
content = content.replace(/className="bg-\[\#111118\] rounded-2xl border border-white\/5 overflow-hidden shadow-2xl"/g, 'className="bg-[#0A0A0A] rounded-[16px] border border-white/10 overflow-hidden"');
content = content.replace(/className="bg-\[\#111118\] border border-white\/5 rounded-2xl p-8 relative overflow-hidden"/g, 'className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-5 relative overflow-hidden"');

// Fix the `.p-8` headers of those tables
// "p-8 border-b border-white/5 flex items-center justify-between"
content = content.replace(/className="p-8 border-b border-white\/5 flex items-center justify-between"/g, 'className="p-5 border-b border-white/10 flex items-center justify-between"');
content = content.replace(/className="p-8 border-b border-white\/5 flex justify-between items-center"/g, 'className="p-5 border-b border-white/10 flex justify-between items-center"');
content = content.replace(/className="p-8 border-b border-white\/5"/g, 'className="p-5 border-b border-white/10"');

// Fix text-[18px] font-bold text-white mb-1 (table headers)
content = content.replace(/text-lg font-bold text-white/g, 'text-[15px] font-semibold text-white');

// Fix sub texts text-[#B0B0B0] text-sm -> text-[13px] text-[#B0B0B0]
content = content.replace(/text-sm text-\[\#B0B0B0\]/g, 'text-[13px] text-[#B0B0B0]');


fs.writeFileSync('src/pages/Admin.tsx', content);
