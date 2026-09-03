#!/usr/bin/env node
/**
 * Audio Studio smoke tests:
 * 1) script parser
 * 2) ffmpeg merge of real generated sine tones (NOT TTS — merge pipeline only)
 * 3) optional live TTS when OPENAI_API_KEY is present
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { parseScript } = require('../api/lib/script-parser');
const { mergeMp3Buffers } = require('../api/lib/merge-audio');
const { getConfiguredProviders, createTTSProvider } = require('../api/lib/tts/provider');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeToneMp3(outFile, freq = 440, seconds = 0.4) {
  const r = spawnSync(ffmpegPath, [
    '-y', '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${seconds}`,
    '-c:a', 'libmp3lame', '-b:a', '128k', outFile
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || 'ffmpeg tone failed');
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

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jazal-test-'));
  const a = path.join(dir, 'a.mp3');
  const b = path.join(dir, 'b.mp3');
  makeToneMp3(a, 440, 0.35);
  makeToneMp3(b, 660, 0.35);
  const merged = await mergeMp3Buffers([fs.readFileSync(a), fs.readFileSync(b)]);
  assert(merged.buffer.length > 500, 'merged mp3 too small');
  assert(merged.buffer[0] === 0xff || merged.buffer.slice(0, 3).toString() === 'ID3', 'merged payload not mp3-like');
  const out = path.join(dir, 'merged.mp3');
  fs.writeFileSync(out, merged.buffer);
  console.log(`✓ ffmpeg merge → ${out} (${merged.size} bytes, ~${merged.durationSec}s)`);

  const providers = getConfiguredProviders();
  if (!providers.length) {
    console.log('⚠ TTS live test skipped — set OPENAI_API_KEY (or GOOGLE_TTS_API_KEY) for real generation');
    console.log('JAZAL audio-studio smoke tests passed (parser + merge)');
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
