import fs from 'fs';

const FILE = './src/pages/MotoFeed.tsx';
let content = fs.readFileSync(FILE, 'utf-8');

// Just print the content for now, I'll use multi_edit_file instead.
