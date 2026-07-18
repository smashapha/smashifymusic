const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace static import with lazy import
code = code.replace(
  "import MainLayout from './components/common/MainLayout';",
  "const MainLayout = lazy(() => import('./components/common/MainLayout'));"
);

fs.writeFileSync('src/App.tsx', code);
