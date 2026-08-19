const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const oldQuickPicks = `<div className="grid grid-rows-4 grid-flow-col gap-x-6 gap-y-2 overflow-x-auto snap-x no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 auto-cols-[85vw] md:auto-cols-[340px]">
            {trendingSongs.map((song) => (
              <div 
                key={\`quick-\${song.id}\`} 
                className="flex items-center gap-3 p-2 rounded-[12px] bg-[#1A1A1A]/40 border border-white/5 hover:border-white/15 hover:bg-[#1A1A1A] snap-start group cursor-pointer transition-colors" 
                onClick={() => playSong(song)}
              >
                <div className="relative w-[48px] h-[48px] md:w-[52px] md:h-[52px] rounded-[8px] overflow-hidden flex-shrink-0 bg-black/40">
                   <img src={optimizeImage(song.cover_url, 120, 120)} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={18} className="fill-white text-white ml-0.5" />
                   </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-semibold text-white truncate mb-0.5 group-hover:text-[#00A3FF] transition-colors">{song.title}</h4>
                  <div className="flex items-center gap-1.5">
                    {(song as any).is_explicit && <span className="px-1 bg-white/10 text-white rounded-[3px] text-[8px] font-bold">E</span>}
                    <span className="text-[12px] text-[#B0B0B0] truncate">{song.artist_name}</span>
                  </div>
                </div>
                <button className="p-2 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            ))}
          </div>`;

const newQuickPicks = `<div className="grid grid-rows-3 grid-flow-col gap-x-4 gap-y-3 overflow-x-auto snap-x no-scrollbar pb-6 -mx-4 px-4 md:mx-0 md:px-0 auto-cols-[85vw] md:auto-cols-[320px]">
            {trendingSongs.map((song, idx) => (
              <div 
                key={\`quick-\${song.id}\`} 
                className="relative flex items-center gap-4 p-2.5 rounded-[16px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 snap-start group cursor-pointer transition-all duration-300" 
                onClick={() => {
                  const newQueue = [song, ...trendingSongs.filter(s => s.id !== song.id)];
                  playQueue(newQueue);
                }}
              >
                {/* Background glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#00A3FF]/0 via-[#00A3FF]/0 to-[#00A3FF]/5 opacity-0 group-hover:opacity-100 rounded-[16px] transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative w-[56px] h-[56px] rounded-[10px] overflow-hidden flex-shrink-0 bg-black/40 shadow-md">
                   <img src={optimizeImage(song.cover_url, 120, 120)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" decoding="async" />
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                      <Play size={20} className="fill-white text-white ml-1 drop-shadow-md" />
                   </div>
                </div>
                
                <div className="flex-1 min-w-0 z-10">
                  <h4 className="text-[15px] font-bold text-white truncate mb-1 group-hover:text-[#00A3FF] transition-colors">{song.title}</h4>
                  <div className="flex items-center gap-2">
                    {(song as any).is_explicit && <span className="px-1 py-[1px] bg-white/10 text-white rounded-[4px] text-[9px] font-black tracking-wider uppercase">E</span>}
                    <span className="text-[13px] text-[#B0B0B0] truncate group-hover:text-white/80 transition-colors">{song.artist_name}</span>
                  </div>
                </div>
                
                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/50 hover:text-white hover:bg-[#00A3FF] opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm shadow-black/50" onClick={(e) => { e.stopPropagation(); /* Add to queue or options menu */ }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            ))}
          </div>`;

code = code.replace(oldQuickPicks, newQuickPicks);

fs.writeFileSync('src/pages/Home.tsx', code);
console.log('Quick picks patched!');
