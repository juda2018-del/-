#!/usr/bin/env node
/**
 * Verify deployed JAZAL builds (production + optional preview URL).
 *
 * Usage:
 *   node scripts/verify-production.js
 *   node scripts/verify-production.js https://temporary-xxx.vercel.app
 */
const PROD = process.env.JAZAL_PROD_URL || 'https://jazal.vercel.app';
const EXPECT = process.env.JAZAL_EXPECT_VERSION || 'jazal-audio-studio-v1';
const extra = process.argv.slice(2);

async function checkApp(label, url) {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/app.js`, { signal: AbortSignal.timeout(20000) });
    const body = await res.text();
    const hasVersion = body.includes(EXPECT);
    const hasLegacy = body.includes('createUserWithEmailAndPassword') || body.includes('jazal-clean-rebuild');
    const hasGuestDefault = body.includes("logged:false") && body.includes("name:'ضيف'");
    const hasStudio = body.includes('audioStudio') && body.includes('/api/audio-generate');
    const hasSpeechSynthesis = body.includes('speechSynthesis');
    const hasOpenAiKey = /OPENAI_API_KEY|sk-[a-zA-Z0-9]{20,}/.test(body);
    const ok = hasVersion && !hasLegacy && hasGuestDefault && hasStudio && !hasSpeechSynthesis && !hasOpenAiKey;
    console.log(`${ok ? '✓' : '✗'} ${label} app: ${url}`);
    console.log(`    version ${EXPECT}: ${hasVersion ? 'yes' : 'no'} · legacy: ${hasLegacy ? 'yes' : 'no'} · guest: ${hasGuestDefault ? 'yes' : 'no'} · studio: ${hasStudio ? 'yes' : 'no'}`);
    if (hasSpeechSynthesis) console.log('    FAIL: browser speechSynthesis present in client bundle');
    if (hasOpenAiKey) console.log('    FAIL: OpenAI secret pattern present in client bundle');
    return ok;
  } catch (e) {
    console.log(`✗ ${label} app: ${url} (${e.message})`);
    return false;
  }
}

async function checkAudioApi(label, url) {
  const base = url.replace(/\/$/, '');
  try {
    const healthRes = await fetch(`${base}/api/audio-health`, { signal: AbortSignal.timeout(15000) });
    const health = await healthRes.json();
    const healthOk = healthRes.ok && health.ok === true && health.service === 'jazal-audio-studio';
    console.log(`${healthOk ? '✓' : '✗'} ${label} audio-health: ttsConfigured=${health.ttsConfigured} providers=${JSON.stringify(health.providers || [])}`);

    const aliasRes = await fetch(`${base}/api/audio-studio/health`, { signal: AbortSignal.timeout(15000) });
    const aliasOk = aliasRes.ok;
    console.log(`${aliasOk ? '✓' : '✗'} ${label} audio-studio/health alias`);

    const genRes = await fetch(`${base}/api/audio-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '[راوي]\nاختبار' }),
      signal: AbortSignal.timeout(15000),
    });
    let genBody = {};
    try { genBody = await genRes.json(); } catch (_) {}
    const authOk = genRes.status === 401 || genRes.status === 403;
    console.log(`${authOk ? '✓' : '✗'} ${label} audio-generate auth gate: HTTP ${genRes.status} ${genBody.code || genBody.error || ''}`);

    if (!health.ttsConfigured) {
      console.log(`⚠ ${label}: OPENAI_API_KEY not configured on this deployment (real MP3 generate blocked)`);
    }

    return healthOk && aliasOk && authOk;
  } catch (e) {
    console.log(`✗ ${label} audio API: ${e.message}`);
    return false;
  }
}

async function main() {
  const urls = [{ label: 'Production', url: PROD }, ...extra.map((u, i) => ({ label: `Preview ${i + 1}`, url: u }))];
  let allOk = true;
  for (const { label, url } of urls) {
    const appOk = await checkApp(label, url);
    const apiOk = await checkAudioApi(label, url);
    if (label === 'Production') allOk = appOk && apiOk && allOk;
  }
  process.exit(allOk ? 0 : 1);
}

main();
