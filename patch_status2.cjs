const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const regex1 = /<div className=\{`w-\[6px\] h-\[6px\] rounded-full \$\{song\.approved \? 'bg-smash-green' : 'bg-\[#eab308\] animate-pulse'\}`\} \/>/g;
const replace1 = `<div className={\`w-[6px] h-[6px] rounded-full \${
                        !song.approved ? 'bg-[#eab308] animate-pulse' : 
                        (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                          ? 'bg-smash-orange' 
                          : 'bg-smash-green')
                      }\`} />`;

const regex2 = /<span className=\{`text-\[10px\] font-display font-medium \$\{song\.approved \? 'text-smash-green' : 'text-\[#eab308\]'\}`\}>\s*\{song\.approved \? 'Live' : 'Rev'\}\s*<\/span>/g;
const replace2 = `<span className={\`text-[10px] font-display font-medium \${
                        !song.approved ? 'text-[#eab308]' : 
                        (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                          ? 'text-smash-orange' 
                          : 'text-smash-green')
                      }\`}>
                         {!song.approved ? 'Rev' : 
                          (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                            ? \`Upcoming (\${new Date(song.release_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})})\` 
                            : 'Live')}
                      </span>`;

code = code.replace(regex1, replace1);
code = code.replace(regex2, replace2);

fs.writeFileSync('src/pages/ArtistHub.tsx', code);
console.log('ArtistHub.tsx status chip patched!');
