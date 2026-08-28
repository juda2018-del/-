#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const issues = [];

if (/eval\(/.test(appJs)) issues.push('eval() usage detected');
if (/innerHTML\s*=/.test(appJs) && !/function esc\(/.test(appJs)) issues.push('innerHTML without esc()');
if (/apiKey:\s*process/.test(appJs)) issues.push('dynamic apiKey reference');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
if (!html.includes('dir="rtl"')) issues.push('index.html missing RTL');
if (!html.includes('lang="ar"')) issues.push('index.html missing Arabic lang');

if (issues.length) {
  issues.forEach(i => console.error('LINT:', i));
  process.exit(1);
}
console.log('JAZAL lint check passed');
