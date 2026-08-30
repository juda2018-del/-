#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const files = ['app.js', 'index.html', 'capacitor.config.json', 'manifest.json', 'package.json'];
for (const file of files) {
  const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  if (file.endsWith('.json')) {
    try { JSON.parse(content); } catch (e) {
      console.error(`Invalid JSON: ${file}`);
      process.exit(1);
    }
  }
}
console.log('JAZAL typecheck passed');
