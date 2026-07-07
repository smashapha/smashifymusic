const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

// 1. Remove states from ArtistHub
code = code.replace('  const [promoModalSong, setPromoModalSong] = useState<any>(null);\n', '');
code = code.replace('  const [promoPercent, setPromoPercent] = useState(20);\n', '');
code = code.replace('  const [promoEndsAt, setPromoEndsAt] = useState("");\n', '');

// 2. Add states to SongsTab
const songsTabStart = "const SongsTab = ({ songs, onRefresh, setActiveTab, userProfile }: any) => {";
const songsTabStates = `
  const [promoModalSong, setPromoModalSong] = useState<any>(null);
  const [promoPercent, setPromoPercent] = useState(20);
  const [promoEndsAt, setPromoEndsAt] = useState("");
`;
code = code.replace(songsTabStart, songsTabStart + songsTabStates);

// 3. Remove modal from ArtistHub
const modalStart = "      {promoModalSong && (";
const modalEnd = "      )}";
const overlayStart = "      {/* Mobile Sidebar Overlay */}";

// The patch inserted it like: modalCode + overlayStart
// Let's just use regex to remove it
code = code.replace(/\{promoModalSong && \([\s\S]*?\}\)[\s\n]*\{\/\* Mobile Sidebar Overlay \*\/\}/g, "{/* Mobile Sidebar Overlay */}");

// 4. Add modal to SongsTab's return
const songsTabReturn = "return (\n    <div className=\"space-y-6\">";
const newSongsTabReturn = `return (
    <div className="space-y-6">
      {promoModalSong && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setPromoModalSong(null); }}>
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[24px] p-6">
            <h3 className="text-base font-studio font-black uppercase tracking-wider text-white mb-1">Run a Promotion</h3>
            <p className="text-[11px] text-smash-gray mb-6">{promoModalSong.title} — currently MK {promoModalSong.price?.toLocaleString()}</p>

            <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2">Discount</label>
            <input type="range" min={5} max={90} step={5} value={promoPercent} onChange={e => setPromoPercent(Number(e.target.value))} className="w-full mb-1" />
            <p className="text-[13px] font-display font-bold text-white mb-4">
              {promoPercent}% off → MK {Math.max(Math.round(promoModalSong.price * (1 - promoPercent / 100)), 1).toLocaleString()}
            </p>

            <label className="text-[11px] text-text-muted font-display font-black uppercase tracking-widest block mb-2">Ends at</label>
            <input type="datetime-local" value={promoEndsAt} onChange={e => setPromoEndsAt(e.target.value)} className="w-full h-12 bg-bg-elevated border border-white/5 rounded-xl px-4 text-[14px] font-display font-bold text-white outline-none mb-6" />

            <div className="flex gap-2">
              {promoModalSong.discount_percent > 0 && (
                <button onClick={cancelPromo} className="flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest bg-white/5 text-text-secondary hover:text-white transition-all">Remove Promo</button>
              )}
              <button onClick={savePromo} className="flex-1 h-12 rounded-xl text-[11px] font-display font-black uppercase tracking-widest bg-smash-orange text-white transition-all">Save</button>
            </div>
          </div>
        </div>
      )}`;
code = code.replace(songsTabReturn, newSongsTabReturn);

// Also fix `fetchData` since it's not available in SongsTab, use `onRefresh` instead
code = code.replace(/fetchData\(false\); \/\/ Refresh/g, "onRefresh(); // Refresh");

fs.writeFileSync('src/pages/ArtistHub.tsx', code);
