const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const regex = /<div className="h-16 flex items-center justify-between px-6 border-b border-white\/5">[\s\S]*?<button onClick=\{\(\) => setMobileMenuOpen\(false\)\} className="text-\[\#B0B0B0\] hover:text-white">/;

const replacement = \`<div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[10px] bg-[#00A3FF]/15 border border-[#00A3FF]/30 flex items-center justify-center text-[#00A3FF] shrink-0">
                       <ShieldCheck size={18} />
                    </div>
                    <div className="leading-tight">
                      <h1 className="font-studio font-semibold text-[14px]">Smashify Admin</h1>
                    </div>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-[#B0B0B0] hover:text-white">\`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/pages/Admin.tsx', content);
