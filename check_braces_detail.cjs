const fs = require('fs');
const code = fs.readFileSync('src/pages/MotoFeed.tsx', 'utf8');

let stack = [];
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') stack.push({ line: i + 1, char: j });
    if (line[j] === '}') {
       if (stack.length === 0) { console.log('Too many closing braces at line ' + (i + 1)); break; }
       stack.pop();
    }
  }
}
if (stack.length > 0) {
  console.log('Unclosed braces opened at:');
  stack.forEach(s => console.log('Line ' + s.line));
} else {
  console.log('All matched!');
}
