const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  'is_for_sale?: boolean;',
  'is_for_sale?: boolean;\n  release_date?: string;'
);

fs.writeFileSync('src/types.ts', code);
