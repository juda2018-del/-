#!/usr/bin/env node
/**
 * Verify deployed JAZAL builds (production + optional preview URL).
 *
 * Usage:
 *   node scripts/verify-production.js
 *   node scripts/verify-production.js https://temporary-xxx.vercel.app
 */
const PROD = process.env.JAZAL_PROD_URL || 'https://jazal.vercel.app';
const EXPECT = process.env.JAZAL_EXPECT_VERSION || 'jazal-prod-ready-v2';
const extra = process.argv.slice(2);

async function check(label, url) {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/app.js`, { signal: AbortSignal.timeout(20000) });
    const body = await res.text();
    const hasVersion = body.includes(EXPECT);
    const hasLegacy = body.includes('createUserWithEmailAndPassword') || body.includes('jazal-clean-rebuild');
    const hasGuestDefault = body.includes("logged:false") && body.includes("name:'ضيف'");
    const ok = hasVersion && !hasLegacy && hasGuestDefault;
    console.log(`${ok ? '✓' : '✗'} ${label}: ${url}`);
    console.log(`    version ${EXPECT}: ${hasVersion ? 'yes' : 'no'} · legacy code: ${hasLegacy ? 'yes' : 'no'} · guest default: ${hasGuestDefault ? 'yes' : 'no'}`);
    return ok;
  } catch (e) {
    console.log(`✗ ${label}: ${url} (${e.message})`);
    return false;
  }
}

async function main() {
  const urls = [{ label: 'Production', url: PROD }, ...extra.map((u, i) => ({ label: `Preview ${i + 1}`, url: u }))];
  let allOk = true;
  for (const { label, url } of urls) {
    const ok = await check(label, url);
    if (label === 'Production') allOk = ok && allOk;
  }
  process.exit(allOk ? 0 : 1);
}

main();
