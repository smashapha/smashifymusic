const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const primaryBtn = 'bg-[#0084D6] hover:bg-[#00A3FF] text-white h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2';

content = content.replace(/className="relative z-10 px-8 py-5 bg-white text-black rounded-xl text-\[11px\] font-bold   hover:bg-\[\#0084D6\] hover:text-white transition-all shadow-2xl flex items-center gap-3 group\/btn"/g, \`className="\${primaryBtn} relative z-10 w-auto h-10"\`);

content = content.replace(/className="px-8 py-4 bg-\[\#0084D6\] hover:bg-\[\#0084D6\]\/90 text-white rounded-xl font-bold   text-\[13px\] transition-all flex items-center gap-2"/g, \`className="\${primaryBtn} h-10"\`); // send notification button

fs.writeFileSync('src/pages/Admin.tsx', content);
