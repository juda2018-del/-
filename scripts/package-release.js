#!/usr/bin/env node
/**
 * Production release package: build + verify + zip www/ for upload.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
const outDir = path.join(root, 'release');
const stamp = new Date().toISOString().slice(0, 10);
const zipName = `jazal-web-${stamp}.zip`;
const zipPath = path.join(outDir, zipName);

function run(cmd, args, label) {
  console.log(`→ ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npm', ['run', 'launch'], 'Launch checks');
run('npx', ['cap', 'sync'], 'Capacitor sync');

if (!fs.existsSync(www)) {
  console.error('Missing www/ — build failed');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

execSync(`cd "${www}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });

const manifest = {
  name: 'JAZAL',
  version: require(path.join(root, 'package.json')).version,
  appVersion: 'jazal-audio-studio-v1',
  builtAt: new Date().toISOString(),
  webRoot: 'www/',
  zip: zipName,
  vercel: {
    buildCommand: 'npm run build',
    outputDirectory: 'www',
    productionBranch: 'main',
  },
  firebase: {
    project: 'jazal-audio',
    hosting: 'npm run firebase:deploy:hosting',
    rules: 'npm run firebase:deploy:rules',
  },
  mobile: {
    bundleId: 'iq.jeeltech.jazal',
    ios: 'npm run cap:open:ios',
    android: 'npm run cap:open:android',
  },
};

fs.writeFileSync(path.join(outDir, 'RELEASE.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log('\n✓ Release package ready');
console.log('  Zip:', zipPath);
console.log('  Manifest:', path.join(outDir, 'RELEASE.json'));
console.log('  Upload www/ to Vercel or run: npm run vercel:link');
