/**
 * Merge MP3 segment buffers (+ optional music/sfx) into one final MP3.
 * Prefers ffmpeg when available; falls back to safe MP3 concatenation for voice-only.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function resolveFfmpeg() {
  try {
    const ffmpegPath = require('ffmpeg-static');
    if (ffmpegPath && fs.existsSync(ffmpegPath)) return ffmpegPath;
  } catch (_) {}
  return null;
}

function run(cmd, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('ffmpeg timed out'));
    }, timeoutMs);
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-400)}`));
    });
  });
}

async function probeDurationSeconds(ffmpegPath, filePath) {
  return new Promise((resolve) => {
    const child = spawn(ffmpegPath, ['-i', filePath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', () => {
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return resolve(0);
      const sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
      resolve(Math.max(0, Math.round(sec)));
    });
  });
}

async function downloadToFile(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Failed to fetch media: ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return dest;
}

/** Strip ID3v2 so concatenated frames remain playable. */
function stripId3(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 10) return buf;
  if (buf.slice(0, 3).toString() !== 'ID3') return buf;
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  const start = 10 + size;
  return start < buf.length ? buf.subarray(start) : buf;
}

function estimateMp3DurationSec(sizeBytes) {
  // Rough estimate for 128–192kbps speech: ~160kbps average
  return Math.max(1, Math.round((Number(sizeBytes) || 0) * 8 / 160000));
}

function concatMp3Buffers(buffers) {
  const parts = buffers.map(stripId3).filter((b) => b && b.length);
  if (!parts.length) throw new Error('No audio segments to merge');
  const buffer = Buffer.concat(parts);
  return {
    buffer,
    durationSec: estimateMp3DurationSec(buffer.length),
    size: buffer.length,
    method: 'concat',
  };
}

async function mergeWithFfmpeg(buffers, { musicUrl = '', sfxUrls = [], musicVolume = 0.12 } = {}, ffmpegPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jazal-audio-'));
  try {
    const segmentFiles = buffers.map((buf, i) => {
      const file = path.join(dir, `seg-${String(i).padStart(3, '0')}.mp3`);
      fs.writeFileSync(file, buf);
      return file;
    });

    const listFile = path.join(dir, 'list.txt');
    fs.writeFileSync(listFile, segmentFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));

    const voiceOnly = path.join(dir, 'voice.mp3');
    await run(ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', voiceOnly]);

    let current = voiceOnly;
    const safeMusic = String(musicUrl || '').trim();
    if (safeMusic.startsWith('https://')) {
      const musicFile = path.join(dir, 'music.mp3');
      await downloadToFile(safeMusic, musicFile);
      const mixed = path.join(dir, 'voice-music.mp3');
      const vol = Math.min(0.4, Math.max(0.02, Number(musicVolume) || 0.12));
      await run(ffmpegPath, [
        '-y', '-i', current, '-i', musicFile,
        '-filter_complex', `[1:a]volume=${vol}[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]`,
        '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '192k', mixed
      ]);
      current = mixed;
    }

    const sfxList = (Array.isArray(sfxUrls) ? sfxUrls : []).map((u) => String(u || '').trim()).filter((u) => u.startsWith('https://')).slice(0, 4);
    for (let i = 0; i < sfxList.length; i++) {
      const sfxFile = path.join(dir, `sfx-${i}.mp3`);
      await downloadToFile(sfxList[i], sfxFile);
      const mixed = path.join(dir, `voice-sfx-${i}.mp3`);
      await run(ffmpegPath, [
        '-y', '-i', current, '-i', sfxFile,
        '-filter_complex', '[1:a]volume=0.35,adelay=400|400[s];[0:a][s]amix=inputs=2:duration=first:dropout_transition=2[a]',
        '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '192k', mixed
      ]);
      current = mixed;
    }

    const out = path.join(dir, 'final.mp3');
    if (current !== out) fs.copyFileSync(current, out);
    const buffer = fs.readFileSync(out);
    const durationSec = await probeDurationSeconds(ffmpegPath, out);
    return { buffer, durationSec, size: buffer.length, method: 'ffmpeg' };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function mergeMp3Buffers(buffers, options = {}) {
  if (!Array.isArray(buffers) || !buffers.length) throw new Error('No audio segments to merge');
  const wantsMix = !!(String(options.musicUrl || '').trim() || (options.sfxUrls || []).length);
  const ffmpegPath = resolveFfmpeg();

  if (ffmpegPath) {
    try {
      return await mergeWithFfmpeg(buffers, options, ffmpegPath);
    } catch (err) {
      if (wantsMix) throw err;
      // Voice-only can fall back to concat if ffmpeg fails on the host.
    }
  } else if (wantsMix) {
    const err = new Error('Music/SFX mixing requires ffmpeg on the server. Generate voice-only, or enable ffmpeg-static install scripts.');
    err.status = 503;
    throw err;
  }

  return concatMp3Buffers(buffers);
}

module.exports = { mergeMp3Buffers, concatMp3Buffers, resolveFfmpeg };
