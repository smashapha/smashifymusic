const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const todayStr = new Date().toISOString().split('T')[0];

const submitLogic = `
                           {releaseDate > '${todayStr}' && (
                             <div className="p-4 bg-[#00A3FF]/10 border border-[#00A3FF]/20 rounded-2xl mb-4">
                               <p className="text-[12px] font-bold text-[#00A3FF]">
                                 🗓️ This will be scheduled for release on {new Date(releaseDate).toLocaleDateString()}. Fans will be able to pre-save once approved.
                               </p>
                             </div>
                           )}
                           <button type="submit"`;

code = code.replace(
  '<button type="submit"',
  submitLogic
);

fs.writeFileSync('src/pages/ArtistHub.tsx', code);
console.log('ArtistHub.tsx patched with submit message');
