const fs = require('fs');

const files = [
  'src/pages/Home.tsx',
  'src/pages/Discover.tsx',
  'src/pages/Trending.tsx',
  'src/pages/Pricing.tsx',
  'src/pages/About.tsx',
  'src/pages/Terms.tsx',
  'src/pages/Privacy.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\s*\{\/\* Footer \*\/\}\s*<div[^>]*>\s*<Footer \/>\s*<\/div>/g, '');
  content = content.replace(/\s*\{\/\* Footer \*\/\}\s*(?:\{notifications\.length > 0 && \()?\s*<div[^>]*>[\s\S]*?(?:<\/div>\s*\)\})\s*<Footer \/>\s*<\/div>/, ''); // handle Home.tsx special case if any? Wait, Home.tsx has a different structure?
  fs.writeFileSync(file, content);
}
