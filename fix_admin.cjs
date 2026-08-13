const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

code = code.replace(
  `className="col-span-full p-6 bg-gradient-to-r from-red-500/20 via-smash-purple/20 to-transparent border border-red-500/30 rounded-[30px] flex items-center justify-between group hover:border-red-500 transition-all shadow-2xl shadow-red-500/10"`,
  `className="w-full p-6 bg-gradient-to-r from-red-500/20 via-smash-purple/20 to-transparent border border-red-500/30 rounded-[30px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-red-500 transition-all shadow-2xl shadow-red-500/10"`
);

code = code.replace(
  `                 <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={32} />
                 </div>`,
  `                 <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
                 </div>`
);

fs.writeFileSync('src/pages/ArtistHub.tsx', code);
