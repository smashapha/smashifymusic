const fs = require('fs');
const code = fs.readFileSync('src/pages/MotoFeed.tsx', 'utf8');

let stack = [];
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') stack.push(i);
  if (code[i] === '}') {
     if (stack.length === 0) { console.log('Too many closing braces at pos ' + i); break; }
     stack.pop();
  }
}
console.log('Unclosed braces count:', stack.length);
