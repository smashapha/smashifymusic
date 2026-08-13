const fs = require('fs');
let code = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

const target = `            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 pt-10 mt-10 border-t border-white/5 w-full"
            >
              {[
                { 
                  value: platformStats.artists > 0 ? platformStats.artists.toLocaleString() : 'Growing', 
                  label: 'Approved Artists',
                  color: 'text-white',
                  bgColor: 'bg-white/10',
                  icon: Mic2
                },
                { 
                  value: platformStats.songs > 0 ? platformStats.songs.toLocaleString() : 'Discover', 
                  label: 'Available Tracks',
                  color: 'text-smash-orange',
                  bgColor: 'bg-smash-orange/10',
                  icon: Music2
                },
                { 
                  value: '95% to Artists', 
                  label: 'No Middlemen',
                  color: 'text-smash-green',
                  bgColor: 'bg-smash-green/10',
                  icon: PieChart
                }
              ].map((stat, i) => (
                <div key={i} className="group relative flex flex-col items-center lg:items-start text-center lg:text-left p-6 lg:p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden shadow-2xl shadow-black/20 hover:-translate-y-1">
                  <div className={\`absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px] \${stat.bgColor} pointer-events-none translate-x-1/2 -translate-y-1/2\`} />
                  
                  <div className={\`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 \${stat.bgColor} border border-white/5 group-hover:scale-110 transition-transform duration-500 relative z-10 shadow-inner\`}>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  
                  <span className={\`text-[clamp(1.1rem,2vw,1.4rem)] font-studio font-bold leading-tight mb-2 \${stat.color} relative z-10\`}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] lg:text-[11px] font-display text-white/50 uppercase tracking-[0.2em] font-semibold relative z-10">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>`;

const replacement = `            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="pt-10 mt-10 border-t border-white/5 w-full flex flex-col md:flex-row items-start lg:items-center justify-start gap-8"
            >
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors shadow-inner">
                  <Mic2 size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-studio font-bold text-[15px] tracking-wide mb-0.5">Direct to Artist</p>
                  <p className="text-text-secondary text-[13px]">Keep up to 95% of royalties</p>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-10 bg-white/10" />

              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-smash-green/10 flex items-center justify-center border border-smash-green/20 group-hover:bg-smash-green/20 transition-colors shadow-inner">
                  <Banknote size={20} className="text-smash-green" />
                </div>
                <div>
                  <p className="text-white font-studio font-bold text-[15px] tracking-wide mb-0.5">Local Mobile Money</p>
                  <p className="text-text-secondary text-[13px]">Airtel Money & TNM Mpamba</p>
                </div>
              </div>
              
              <div className="hidden lg:block w-px h-10 bg-white/10" />

              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-smash-cyan/10 flex items-center justify-center border border-smash-cyan/20 group-hover:bg-smash-cyan/20 transition-colors shadow-inner">
                  <Smartphone size={20} className="text-smash-cyan" />
                </div>
                <div>
                  <p className="text-white font-studio font-bold text-[15px] tracking-wide mb-0.5">Listen Anywhere</p>
                  <p className="text-text-secondary text-[13px]">Offline saves & high quality</p>
                </div>
              </div>
            </motion.div>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/Landing.tsx', code);
