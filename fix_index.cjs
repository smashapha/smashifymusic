const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Remove transparenttextures preload
code = code.replace(/<link rel="preload" as="image" href="https:\/\/www\.transparenttextures\.com\/patterns\/music\.png" \/>\n?\s*/g, "");

// Remove duplicate manifest
code = code.replace(/<link rel="manifest" href="\/manifest\.json">\n?\s*/g, "");

fs.writeFileSync('index.html', code);
