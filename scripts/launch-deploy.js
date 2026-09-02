#!/usr/bin/env node
/**
 * Attempt production deploy using whichever credentials are available.
 * Never fails the process — logs next steps when secrets are missing.
 */
const { spawnSync } = require('child_process');

function run(cmd, args, label) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', env: process.env, shell: false });
  if (result.status === 0) {
    console.log(`✓ ${label}`);
    return true;
  }
  console.warn(`✗ ${label} (exit ${result.status ?? 'unknown'})`);
  return false;
}

async function verifyVercel(url = 'https://jazal.vercel.app') {
  try {
    const res = await fetch(`${url}/app.js`, { signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    const ok = body.includes('jazal-prod-ready-v1') && !body.includes('createUserWithEmailAndPassword');
    console.log(ok ? `✓ Production verified: ${url}` : `⚠ Production still on old build: ${url}`);
    return ok;
  } catch (e) {
    console.warn(`Could not verify ${url}:`, e.message);
    return false;
  }
}

function tokenLooksInvalid(value) {
  if (!value) return true;
  return value.startsWith('vcn_');
}

async function main() {
  console.log('JAZAL auto-deploy');
  let deployed = false;

  if (process.env.VERCEL_TOKEN?.startsWith('vcn_')) {
    console.warn('⚠ VERCEL_TOKEN is an anonymous claim token (vcn_*) — ignored.');
    console.warn('  Replace with API token: https://vercel.com/account/tokens');
  }

  if (process.env.VERCEL_TOKEN && process.env.VERCEL_ORG_ID && !tokenLooksInvalid(process.env.VERCEL_TOKEN)) {
    deployed = run('node', ['scripts/vercel-deploy-prebuilt.js'], 'Vercel prebuilt production deploy') || deployed;
    deployed = run('node', ['scripts/vercel-link.js'], 'Vercel API link + production deploy') || deployed;
  }

  if (!deployed && process.env.VERCEL_DEPLOY_HOOK) {
    deployed = run('node', ['scripts/vercel-deploy-hook.js'], 'Vercel deploy hook') || deployed;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    run('npm', ['run', 'firebase:deploy:rules'], 'Firebase rules');
    run('npm', ['run', 'firebase:deploy:hosting'], 'Firebase hosting') || deployed;
  }

  if (!deployed) {
    console.log('\n→ Publishing temporary preview (no production credentials)...');
    const preview = spawnSync('node', ['scripts/deploy-preview.js'], { stdio: 'inherit', env: process.env, shell: false });
    if (preview.status === 0) deployed = true;
  }

  await verifyVercel();

  if (!deployed) {
    console.log('\nNo deploy credentials found. Add to Cursor environment secrets:');
    console.log('  VERCEL_TOKEN + VERCEL_ORG_ID  → npm run vercel:link');
    console.log('  VERCEL_DEPLOY_HOOK            → auto redeploy on push');
    console.log('  GOOGLE_APPLICATION_CREDENTIALS → Firebase hosting + rules');
    console.log('\nManual (no token): https://vercel.com/juda12/jazal/settings/git');
    console.log('  1. Connect repo juda2018-del/- branch main');
    console.log('  2. Build: npm run build · Output: www');
    console.log('  3. Redeploy production');
    console.log('\nOr claim the preview above while logged into team juda12 → project JAZAL.');
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(0);
});
