const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let original = code;
  
  // Quick regex to add loading="lazy" decoding="async" if not present on <img ...>
  // We'll skip complex string replacements and just do a simple pass
  code = code.replace(/<img([^>]+)>/g, (match, p1) => {
    let result = `<img${p1}>`;
    if (!p1.includes('loading=')) {
      result = result.replace('>', ' loading="lazy">');
    }
    if (!p1.includes('decoding=')) {
      result = result.replace('>', ' decoding="async">');
    }
    // ensure closing tag logic if it was self closing: />
    if (match.endsWith('/>')) {
       result = result.replace(' >', ' />').replace('/> loading="lazy" decoding="async">', ' loading="lazy" decoding="async" />');
    }
    return result;
  });

  if (original !== code) {
    fs.writeFileSync(file, code);
  }
});
