#!/usr/bin/env node
/**
 * Verify deployed JAZAL builds (production + optional preview URL).
 *
 * Usage:
 *   node scripts/verify-production.js
 *   node scripts/verify-production.js https://temporary-xxx.vercel.app
 *
 * Required for PASS: production app.js version + /api/audio-health ok:true.
 * TTS / GitHub Pages / Firebase Hosting are reported only (env/owner blockers).
 */
const PROD = process.env.JAZAL_PROD_URL || 'https://jazal.vercel.app';
const EXPECT = process.env.JAZAL_EXPECT_VERSION || 'jazal-audio-studio-v1';
const extra = process.argv.slice(2);

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = await res.text();
  return { res, body };
}

async function checkApp(label, url) {
  try {
    const { res, body } = await fetchText(`${url.replace(/\/$/, '')}/app.js`);
    if (!res.ok) {
      console.log(`✗ ${label}: ${url} (HTTP ${res.status})`);
      return false;
    }
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

async function checkApiHealth(label, url) {
  try {
    const { res, body } = await fetchText(`${url.replace(/\/$/, '')}/api/audio-health`);
    let json = {};
    try { json = JSON.parse(body); } catch (_) { json = {}; }
    const ok = res.ok && json.ok === true && json.service === 'jazal-audio-studio';
    const tts = json.ttsConfigured === true;
    console.log(`${ok ? '✓' : '✗'} ${label} API: ${url}/api/audio-health`);
    console.log(`    ok:${json.ok === true ? 'yes' : 'no'} · ttsConfigured:${tts ? 'yes' : 'no'} · providers:${(json.providers || []).join(',') || 'none'}`);
    if (!tts) {
      console.log('    note: TTS is an admin Audio Studio secret (OPENAI_API_KEY on Vercel). Core listening does not need it.');
    }
    return ok;
  } catch (e) {
    console.log(`✗ ${label} API: ${url}/api/audio-health (${e.message})`);
    return false;
  }
}

async function reportSecondary(name, url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const mark = res.ok ? 'i' : '!';
    console.log(`${mark} ${name}: ${url} (HTTP ${res.status}) — informational, not required for Vercel production`);
  } catch (e) {
    console.log(`! ${name}: ${url} (${e.message}) — informational, not required for Vercel production`);
  }
}

async function main() {
  const urls = [{ label: 'Production', url: PROD }, ...extra.map((u, i) => ({ label: `Preview ${i + 1}`, url: u }))];
  let allOk = true;
  for (const { label, url } of urls) {
    const appOk = await checkApp(label, url);
    if (label === 'Production') {
      const apiOk = await checkApiHealth(label, url);
      allOk = appOk && apiOk && allOk;
    }
  }
  await reportSecondary('GitHub Pages', 'https://juda2018-del.github.io/-/');
  await reportSecondary('Firebase Hosting', 'https://jazal-audio.web.app/');
  process.exit(allOk ? 0 : 1);
}

main();
