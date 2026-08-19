const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const statusCode = `                   <div className={\`flex items-center gap-1.5 px-2.5 py-1 rounded-md border \${
                     !song.approved ? 'bg-[#eab308]/10 border-[#eab308]/20' : 
                     (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                       ? 'bg-smash-orange/10 border-smash-orange/20' 
                       : 'bg-smash-green/10 border-smash-green/20')
                   }\`}>
                      <div className={\`w-[6px] h-[6px] rounded-full \${
                        !song.approved ? 'bg-[#eab308] animate-pulse' : 
                        (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                          ? 'bg-smash-orange' 
                          : 'bg-smash-green')
                      }\`} />
                      <span className={\`text-[10px] font-display font-medium \${
                        !song.approved ? 'text-[#eab308]' : 
                        (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                          ? 'text-smash-orange' 
                          : 'text-smash-green')
                      }\`}>
                         {!song.approved ? 'Rev' : 
                          (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                            ? \`Upcoming (\${new Date(song.release_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})})\` 
                            : 'Live')}
                      </span>
                   </div>`;

code = code.replace(
  /<div className=\{\`flex items-center gap-1\.5 px-2\.5 py-1 rounded-md border \$\{song\.approved \? 'bg-smash-green\/10 border-smash-green\/20' \: 'bg-\[#eab308\]\/10 border-\[#eab308\]\/20'\}\`\}>\s*<div className=\{\`w-\[6px\] h-\[6px\] rounded-full \$\{song\.approved \? 'bg-smash-green' \: 'bg-\[#eab308\] animate-pulse'\}\`\} \/>\s*<span className=\{\`text-\[10px\] font-display font-medium \$\{song\.approved \? 'text-smash-green' \: 'text-\[#eab308\]'\}\`\}>\s*\{song\.approved \? 'Live' \: 'Rev'\}\s*<\/span>\s*<\/div>/g,
  statusCode
);

fs.writeFileSync('src/pages/ArtistHub.tsx', code);
console.log('ArtistHub.tsx patched with upcoming status chip');
