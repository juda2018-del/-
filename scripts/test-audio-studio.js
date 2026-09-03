#!/usr/bin/env node
/**
 * Audio Studio smoke tests:
 * 1) script parser
 * 2) MP3 concat merge (no mock TTS)
 * 3) optional live TTS when OPENAI_API_KEY / GOOGLE_TTS_API_KEY is present
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseScript } = require('../api/lib/script-parser');
const { concatMp3Buffers } = require('../api/lib/merge-audio');
const { getConfiguredProviders, createTTSProvider } = require('../api/lib/tts/provider');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Minimal valid-ish MP3 frame-ish payload for concat plumbing tests (not claimed as speech). */
function tinyMp3Like(seed = 1) {
  const id3 = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const frame = Buffer.alloc(200, seed);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  return Buffer.concat([id3, frame]);
}

async function main() {
  const sample = `[راوي]
كان الليل هادئاً...
[أحمد]
أين نحن؟
[سارة]
لا أعرف...
[راوي]
ثم سمعوا صوتاً من خلف الباب.`;
  const parsed = parseScript(sample);
  assert(parsed.segments.length >= 4, 'expected >=4 segments');
  assert(parsed.roles.includes('راوي') && parsed.roles.includes('أحمد'), 'roles missing');
  console.log('✓ script parser');

  const merged = concatMp3Buffers([tinyMp3Like(1), tinyMp3Like(2)]);
  assert(merged.buffer.length > 100, 'merged too small');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jazal-test-'));
  const out = path.join(dir, 'merged.mp3');
  fs.writeFileSync(out, merged.buffer);
  console.log(`✓ mp3 concat merge → ${out} (${merged.size} bytes)`);

  const providers = getConfiguredProviders();
  if (!providers.length) {
    console.log('⚠ TTS live test skipped — set OPENAI_API_KEY (or GOOGLE_TTS_API_KEY) for real generation');
    console.log('JAZAL audio-studio smoke tests passed (parser + merge plumbing)');
    return;
  }

  const provider = createTTSProvider();
  const buf = await provider.synthesize({
    text: 'هذا اختبار قصير لاستوديو صوت جزل.',
    voice: 'onyx',
  });
  assert(buf.length > 1000, 'tts buffer too small');
  const ttsOut = path.join(dir, 'tts-test.mp3');
  fs.writeFileSync(ttsOut, buf);
  console.log(`✓ live TTS (${provider.name}) → ${ttsOut} (${buf.length} bytes)`);
  console.log('JAZAL audio-studio smoke tests passed');
}

main().catch((err) => {
  console.error('AUDIO STUDIO TEST FAIL:', err.message);
  process.exit(1);
});
