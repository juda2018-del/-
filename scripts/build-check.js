#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const required = [
  'index.html',
  'app.js',
  'styles.css',
  'sw.js',
  'manifest.json',
  'capacitor.config.json',
  'assets/jazal-demo.mp3',
  'assets/icon.svg',
  'assets/jazal-mark.svg',
  'firebase/firestore.rules',
  'firebase/storage.rules'
];

let failed = false;
for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error(`MISSING: ${file}`);
    failed = true;
  }
}

const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const checks = [
  ['Firebase init', /initializeApp/],
  ['Firestore', /getFirestore/],
  ['Storage', /getStorage/],
  ['Auth', /getAuth/],
  ['MediaSession', /mediaSession/],
  ['Capacitor', /initCapacitor/],
  ['Hash routing', /parseHashRoute/],
  ['Episode navigation', /playNextEpisode/],
  ['Publish filter', /getPublicStories/],
  ['Admin guard', /function isAdmin/],
  ['App version', /jazal-prod-ready-v1/],
];

const firestoreRules = fs.readFileSync(path.join(root, 'firebase', 'firestore.rules'), 'utf8');
if (!/token\.admin/.test(firestoreRules)) {
  console.error('CHECK FAILED: Firestore admin custom claim rules');
  failed = true;
}

for (const [name, re] of checks) {
  if (!re.test(appJs)) {
    console.error(`CHECK FAILED: ${name}`);
    failed = true;
  }
}

const cap = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
if (cap.appId !== 'iq.jeeltech.jazal') {
  console.error('Capacitor appId must be iq.jeeltech.jazal');
  failed = true;
}

if (failed) {
  process.exit(1);
}
console.log('JAZAL build check passed');
