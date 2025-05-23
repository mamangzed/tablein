const fs = require('fs');
const { execSync } = require('child_process');

const distPath = './dist';

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath);
}

execSync('npx terser src/tablein.js -c -m -o dist/tablein.min.js --comments false', { stdio: 'inherit' });
