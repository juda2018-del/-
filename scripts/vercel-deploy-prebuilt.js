#!/usr/bin/env node
/**
 * Deploy prebuilt www/ to the existing JAZAL Vercel project (production).
 * Requires a real API token — not a vcn_* claim token.
 *
 *   VERCEL_TOKEN=... VERCEL_ORG_ID=team_... npm run vercel:prebuilt
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.VERCEL_TOKEN;
const ORG_ID = process.env.VERCEL_ORG_ID;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_9e9ngS2Ku57628F3qUUtDgz6SN55';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!TOKEN || TOKEN.startsWith('vcn_')) {
  fail('VERCEL_TOKEN missing or invalid (vcn_* claim tokens cannot deploy to production).\nCreate one: https://vercel.com/account/tokens');
}
if (!ORG_ID) {
  fail('VERCEL_ORG_ID missing. Team juda12 → Settings → General → Team ID (team_…)');
}

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
const vercelDir = path.join(root, '.vercel');

console.log('→ Building www/');
const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: false });
if (build.status !== 0) process.exit(build.status ?? 1);
if (!fs.existsSync(www)) fail('Missing www/ after build');

fs.mkdirSync(vercelDir, { recursive: true });
fs.writeFileSync(
  path.join(vercelDir, 'project.json'),
  JSON.stringify({ orgId: ORG_ID, projectId: PROJECT_ID }, null, 2)
);

const env = { ...process.env, VERCEL_TOKEN: TOKEN };
console.log(`→ Deploying www/ to project ${PROJECT_ID} (production)`);
const deploy = spawnSync(
  'npx',
  ['vercel', 'deploy', '--prebuilt', '--prod', '--yes'],
  { cwd: www, stdio: 'inherit', env, shell: false }
);

if (deploy.status === 0) {
  console.log('✓ Production deploy submitted. Run: npm run deploy:verify');
}
process.exit(deploy.status ?? 1);
