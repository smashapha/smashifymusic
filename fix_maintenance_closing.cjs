const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

content = content.replace(
    /\{activeTab === 'maintenance' && \([\s]*<div className="space-y-6">/g,
    `{activeTab === 'maintenance' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">`
);

content = content.replace(/<\/form><\/div>/g, '</form>');

fs.writeFileSync('src/pages/Admin.tsx', content);
