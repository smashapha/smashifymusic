const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const regex = /<span className=\{`text-\[12px\] font-display font-medium \$\{song\.approved \? 'text-smash-green' : 'text-\[#eab308\]'\}`\}>\s*\{song\.approved \? 'Distributed' : 'Reviewing'\}\s*<\/span>/g;
const replace = `<span className={\`text-[12px] font-display font-medium \${
                        !song.approved ? 'text-[#eab308]' : 
                        (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                          ? 'text-smash-orange' 
                          : 'text-smash-green')
                      }\`}>
                         {!song.approved ? 'Reviewing' : 
                          (new Date(song.release_date || song.created_at) > new Date(new Date().toISOString().split('T')[0]) 
                            ? \`Upcoming (\${new Date(song.release_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})})\` 
                            : 'Distributed')}
                      </span>`;

code = code.replace(regex, replace);

fs.writeFileSync('src/pages/ArtistHub.tsx', code);
console.log('ArtistHub.tsx status chip desktop patched!');
