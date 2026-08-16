const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Replace table header class
content = content.replace(/<thead[^>]*>/g, '<thead className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 z-10">');
// Header row usually doesn't need border-b if thead has it, but let's make sure
content = content.replace(/<tr className="text-left text-\[11px\][^"]*"/g, '<tr className="text-left text-[11px] font-medium tracking-[0.12em] text-[#737373] uppercase"');

// Fix <th> padding
content = content.replace(/<th className="([^"]*)"/g, (match, classes) => {
    let newClasses = classes.replace(/px-\d+/, '').replace(/py-\d+/, '').replace(/pb-\d+/, '');
    newClasses += ' px-4 py-3';
    // Clean up multiple spaces
    newClasses = newClasses.replace(/\s+/g, ' ').trim();
    return `<th className="${newClasses}"`;
});
// Some th don't have classes
content = content.replace(/<th>/g, '<th className="px-4 py-3">');

// Fix <td className="...">
content = content.replace(/<td className="([^"]*)"/g, (match, classes) => {
    let newClasses = classes.replace(/px-\d+/, '').replace(/py-\d+/, '');
    newClasses += ' px-4 py-3 md:px-5 text-[13px]';
    newClasses = newClasses.replace(/\s+/g, ' ').trim();
    return `<td className="${newClasses}"`;
});
// <td> without class
content = content.replace(/<td>/g, '<td className="px-4 py-3 md:px-5 text-[13px]">');

// Rows border-b white/5 hover:bg-white/5
content = content.replace(/<tr className="border-b border-white\/5 hover:bg-white\/5 transition-colors"/g, '<tr className="border-b border-white/5 hover:bg-white/5 transition-colors"');
content = content.replace(/<tr key=\{([^}]+)\} className="border-b border-white\/5"/g, '<tr key={$1} className="border-b border-white/5 hover:bg-white/5 transition-colors"');
content = content.replace(/<tr key=\{([^}]+)\} className="hover:bg-white\/5 transition-colors"/g, '<tr key={$1} className="border-b border-white/5 hover:bg-white/5 transition-colors"');

fs.writeFileSync('src/pages/Admin.tsx', content);
