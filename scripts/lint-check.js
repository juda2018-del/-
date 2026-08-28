#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const issues = [];

if (/eval\(/.test(appJs)) issues.push('eval() usage detected');
if (/createUserWithEmailAndPassword/.test(appJs)) issues.push('public admin signup must be removed');
if (!/function isAdmin\(/.test(appJs)) issues.push('missing isAdmin() guard');
if (/innerHTML\s*=/.test(appJs) && !/function esc\(/.test(appJs)) issues.push('innerHTML without esc()');
if (/apiKey:\s*process/.test(appJs)) issues.push('dynamic apiKey reference');

const firestoreRules = fs.readFileSync(path.join(__dirname, '..', 'firebase', 'firestore.rules'), 'utf8');
const storageRules = fs.readFileSync(path.join(__dirname, '..', 'firebase', 'storage.rules'), 'utf8');
if (!/token\.admin/.test(firestoreRules)) issues.push('firestore.rules missing admin custom claim');
if (!/token\.admin/.test(storageRules)) issues.push('storage.rules missing admin custom claim');
if (/allow write: if request\.auth != null/.test(firestoreRules)) issues.push('insecure firestore write rule');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
if (!html.includes('dir="rtl"')) issues.push('index.html missing RTL');
if (!html.includes('lang="ar"')) issues.push('index.html missing Arabic lang');

if (issues.length) {
  issues.forEach(i => console.error('LINT:', i));
  process.exit(1);
}
console.log('JAZAL lint check passed');
