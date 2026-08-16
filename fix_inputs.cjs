const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const inputClasses = 'w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors';

// Find common input class patterns and replace them
content = content.replace(/className="[^"]*bg-white\/5 border border-white\/10 rounded-xl text-sm font-bold focus:outline-none focus:border-\[\#00A3FF\] transition-all[^"]*"/g, `className="${inputClasses}"`);

// Replace generic inputs inside forms
content = content.replace(/<input\s+([^>]*)className="[^"]*"/g, `<input $1className="${inputClasses}"`);
content = content.replace(/<textarea\s+([^>]*)className="[^"]*"/g, `<textarea $1className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[12px] min-h-[100px] text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"`);
content = content.replace(/<select\s+([^>]*)className="[^"]*"/g, `<select $1className="${inputClasses}"`);

fs.writeFileSync('src/pages/Admin.tsx', content);
