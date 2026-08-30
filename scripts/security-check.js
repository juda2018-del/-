#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const firestoreRules = fs.readFileSync(path.join(root, 'firebase', 'firestore.rules'), 'utf8');
const storageRules = fs.readFileSync(path.join(root, 'firebase', 'storage.rules'), 'utf8');
const issues = [];

const secretPatterns = [
  [/private_key/i, 'private_key in repo'],
  [/serviceAccount/i, 'service account JSON in repo'],
  [/createUserWithEmailAndPassword/, 'public admin signup'],
  [/signupAdminForm/, 'public admin signup form'],
  [/eval\(/, 'eval() usage'],
  [/password\s*[:=]\s*['"][^'"]+['"]/i, 'hardcoded password'],
];

for (const [pattern, label] of secretPatterns) {
  if (pattern.test(appJs)) issues.push(label);
}

if (!/function isAdmin\(/.test(appJs)) issues.push('missing isAdmin()');
if (!/requireAdmin\(/.test(appJs)) issues.push('missing requireAdmin()');
if (!/token\.admin/.test(firestoreRules)) issues.push('firestore rules missing admin claim');
if (!/token\.admin/.test(storageRules)) issues.push('storage rules missing admin claim');
if (/allow write: if request\.auth != null;/.test(firestoreRules)) issues.push('insecure firestore write rule');

const tracked = [
  'firebase/serviceAccount.json',
  'firebase/jazal-audio-firebase-adminsdk.json',
  '.env'
];
for (const file of tracked) {
  if (fs.existsSync(path.join(root, file))) issues.push(`tracked secret file present: ${file}`);
}

if (issues.length) {
  issues.forEach(i => console.error('SECURITY:', i));
  process.exit(1);
}
console.log('JAZAL security check passed');
