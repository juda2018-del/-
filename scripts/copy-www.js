const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const copyItems = [
  'index.html', 'app.js', 'styles.css', 'sw.js', 'manifest.json', 'robots.txt', 'assets', 'firebase'
];

if (fs.existsSync(out)) fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const item of copyItems) {
  const src = path.join(root, item);
  const dest = path.join(out, item);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, dest, { recursive: true });
}

console.log('Copied static assets to www/');
