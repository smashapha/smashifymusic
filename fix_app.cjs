const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Check if ErrorBoundary is already imported
if (!code.includes('import { ErrorBoundary }')) {
  // Add the import statement
  code = code.replace(
    "import { verifyPayment } from './lib/paychangu';",
    "import { verifyPayment } from './lib/paychangu';\nimport { ErrorBoundary } from './components/common/ErrorBoundary';"
  );
  fs.writeFileSync('src/App.tsx', code);
}
