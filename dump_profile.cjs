const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(200, 300).join('\n'));
