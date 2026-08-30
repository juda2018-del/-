#!/usr/bin/env node
/**
 * Publish a temporary Vercel preview (latest build, Aurora theme).
 * Strips invalid vcn_* VERCEL_TOKEN so anonymous deploy works.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const env = { ...process.env };
if (env.VERCEL_TOKEN?.startsWith('vcn_')) delete env.VERCEL_TOKEN;

const vercelDir = path.join(__dirname, '..', '.vercel');
if (fs.existsSync(vercelDir)) {
  try { fs.rmSync(vercelDir, { recursive: true, force: true }); } catch (_) {}
}

console.log('Building JAZAL...');
let r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env, shell: false });
if (r.status !== 0) process.exit(r.status ?? 1);

console.log('Deploying preview to Vercel...');
r = spawnSync('npx', ['vercel', 'deploy', '--temporary', '--yes'], { stdio: 'pipe', env, shell: false, encoding: 'utf8' });
const out = (r.stdout || '') + (r.stderr || '');
process.stdout.write(out);

const url = out.match(/https:\/\/temporary-[a-z0-9-]+\.vercel\.app/i)?.[0];
const claim = out.match(/https:\/\/vercel\.com\/claim-deployment\?code=[a-f0-9-]+/i)?.[0];

if (url) {
  console.log('\n✓ Preview live:', url);
  console.log('  Open on phone/browser to see Aurora theme.');
}
if (claim) console.log('  Claim (assign to JAZAL):', claim);
if (!url) process.exit(r.status ?? 1);
