const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const badCode = `                                <button onClick={savePromo} className="flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest bg-smash-orange text-white transition-all">Save</button>
            </div>
          </div>
        </div>
      )}`;

code = code.replace(badCode, "");
fs.writeFileSync('src/pages/ArtistHub.tsx', code);
