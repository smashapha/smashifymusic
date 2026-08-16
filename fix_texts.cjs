const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace text-[8px], text-[9px], text-[10px] with text-[13px]
content = content.replace(/text-\[8px\]/g, 'text-[13px]');
content = content.replace(/text-\[9px\]/g, 'text-[13px]');
content = content.replace(/text-\[10px\]/g, 'text-[13px]');

// Replace text-xs with text-[13px]
content = content.replace(/text-xs/g, 'text-[13px]');

// Replace text-sm with text-[13px]
content = content.replace(/text-sm/g, 'text-[13px]');

// Replace text-lg (which isn't heading, or if it is it should be 14-15px) with text-[14px]
content = content.replace(/text-lg/g, 'text-[15px]');

fs.writeFileSync('src/pages/Admin.tsx', content);
