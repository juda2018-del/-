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
// Non-admin adminView must not render admin tab chrome (XSS/UX leak of admin surface).
if (!/function adminView\(\)\{[\s\S]*?if\(!isAdmin\(\)\)\{[\s\S]*?adminTabView\('firebase'\)/.test(appJs.replace(/\n/g,' '))) {
  // fallback simpler: ensure early !isAdmin gate exists before adminTabs in adminView
}
const adminViewMatch = appJs.match(/function adminView\(\)\{[\s\S]*?\nfunction /);
if (adminViewMatch) {
  const body = adminViewMatch[0];
  const gate = body.indexOf('if(!isAdmin())');
  const tabs = body.indexOf('adminTabs()');
  if (gate < 0) issues.push('adminView missing !isAdmin early gate');
  else if (tabs >= 0 && tabs < body.indexOf('return', gate + 10) === -1) {
    // if adminTabs appears only after isAdmin path it's OK; if first return after !isAdmin includes adminTabs → bad
  }
  const nonAdminReturn = body.slice(gate, body.indexOf('const tab=', gate) > 0 ? body.indexOf('const tab=', gate) : body.length);
  if (gate >= 0 && /adminTabs\(\)/.test(nonAdminReturn)) issues.push('adminView exposes adminTabs to non-admin');
}

if (/speechSynthesis/.test(appJs)) issues.push('browser speechSynthesis must not be used for production TTS');
if (/OPENAI_API_KEY|sk-[a-zA-Z0-9]{10,}/.test(appJs)) issues.push('TTS API key must not appear in client app.js');
if (!fs.existsSync(path.join(root, 'api', 'audio-studio', 'generate.js'))) issues.push('missing audio studio generate API');
const audioGenerate = fs.readFileSync(path.join(root, 'api', 'audio-generate.js'), 'utf8');
const verifyAdmin = fs.readFileSync(path.join(root, 'api', 'lib', 'verify-admin.js'), 'utf8');
if (/require\(['"]jose['"]\)/.test(audioGenerate) || /require\(['"]jose['"]\)/.test(verifyAdmin)) {
  issues.push('jose CJS require in audio auth path (ERR_REQUIRE_ESM risk)');
}
if (!/verifyAdminToken/.test(verifyAdmin)) issues.push('missing verifyAdminToken');
if (!/audio-studio/.test(storageRules)) issues.push('storage rules missing audio-studio path');
if (!/audio-private/.test(storageRules)) issues.push('storage rules missing audio-private path');
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
