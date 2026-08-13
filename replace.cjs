const fs = require('fs');
const lines = fs.readFileSync('src/pages/Landing.tsx', 'utf8').split('\n');

const replacement = `              className="pt-10 mt-10 border-t border-white/5 w-full flex flex-col md:flex-row items-start md:items-center justify-start gap-6 lg:gap-10"
            >
              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors shadow-inner">
                  <Mic2 size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-studio font-bold text-[15px] tracking-wide mb-0.5">Direct to Artist</p>
                  <p className="text-text-secondary text-[13px] font-sans">Keep up to 95% of royalties</p>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-10 bg-white/10" />

              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-smash-green/10 flex items-center justify-center border border-smash-green/20 group-hover:bg-smash-green/20 transition-colors shadow-inner">
                  <Banknote size={20} className="text-smash-green" />
                </div>
                <div>
                  <p className="text-white font-studio font-bold text-[15px] tracking-wide mb-0.5">Local Mobile Money</p>
                  <p className="text-text-secondary text-[13px] font-sans">Airtel Money & TNM Mpamba</p>
                </div>
              </div>
              
              <div className="hidden lg:block w-px h-10 bg-white/10" />

              <div className="flex items-center gap-4 group">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-smash-cyan/10 flex items-center justify-center border border-smash-cyan/20 group-hover:bg-smash-cyan/20 transition-colors shadow-inner">
                  <Smartphone size={20} className="text-smash-cyan" />
                </div>
                <div>
                  <p className="text-white font-studio font-bold text-[15px] tracking-wide mb-0.5">Listen Anywhere</p>
                  <p className="text-text-secondary text-[13px] font-sans">Offline saves & high quality</p>
                </div>
              </div>
            </motion.div>`;

// line 249 is index 248, line 289 is index 288
lines.splice(248, 41, replacement);

fs.writeFileSync('src/pages/Landing.tsx', lines.join('\n'));
