/**
 * POST /api/audio-generate
 * Admin-only Audio Studio generation endpoint.
 * Returns a real audio/mpeg MP3 (not a mock). Does not publish episodes.
 */
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function parseScript(text = '') {
  const MAX_TEXT_CHARS = 12000;
  const MAX_SEGMENT_CHARS = 3800;
  const raw = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!raw) {
    const err = new Error('Episode text is required');
    err.status = 400;
    throw err;
  }
  if (raw.length > MAX_TEXT_CHARS) {
    const err = new Error(`Text too long (max ${MAX_TEXT_CHARS} characters)`);
    err.status = 400;
    throw err;
  }
  const roleLine = /^\[([^\]]+)\]\s*$/;
  const lines = raw.split('\n');
  const segments = [];
  let currentRole = 'راوي';
  let buffer = [];
  const chunkText = (value) => {
    const v = String(value || '').trim();
    if (!v) return [];
    if (v.length <= MAX_SEGMENT_CHARS) return [v];
    const parts = [];
    let remaining = v;
    while (remaining.length > MAX_SEGMENT_CHARS) {
      let cut = remaining.lastIndexOf(' ', MAX_SEGMENT_CHARS);
      if (cut < MAX_SEGMENT_CHARS * 0.5) cut = MAX_SEGMENT_CHARS;
      parts.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) parts.push(remaining);
    return parts;
  };
  const flush = () => {
    const body = buffer.join('\n').trim();
    buffer = [];
    if (!body) return;
    chunkText(body).forEach((chunk) => segments.push({ role: currentRole, text: chunk }));
  };
  for (const line of lines) {
    const m = line.match(roleLine);
    if (m) {
      flush();
      currentRole = String(m[1]).trim().slice(0, 80) || 'راوي';
      continue;
    }
    buffer.push(line);
  }
  flush();
  if (!segments.length) {
    const err = new Error('No speakable text found in script');
    err.status = 400;
    throw err;
  }
  return { segments, roles: [...new Set(segments.map((s) => s.role))], charCount: raw.length };
}

function stripId3(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 10) return buf;
  if (buf.slice(0, 3).toString() !== 'ID3') return buf;
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  const start = 10 + size;
  return start < buf.length ? buf.subarray(start) : buf;
}

function mergeMp3(buffers) {
  const parts = buffers.map(stripId3).filter((b) => b && b.length);
  if (!parts.length) throw new Error('No audio segments to merge');
  const buffer = Buffer.concat(parts);
  const durationSec = Math.max(1, Math.round((buffer.length * 8) / 160000));
  return { buffer, durationSec, size: buffer.length, method: 'concat' };
}

async function verifyAdmin(authorizationHeader = '') {
  const { createRemoteJWKSet, jwtVerify } = require('jose');
  const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'jazal-audio';
  const JWKS = createRemoteJWKSet(
    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
  );
  const match = String(authorizationHeader || '').match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error('Authorization Bearer token required');
    err.status = 401;
    throw err;
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(match[1].trim(), JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    }));
  } catch (_) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }
  if (payload.admin !== true) {
    const err = new Error('Admin custom claim required');
    err.status = 403;
    throw err;
  }
  return payload;
}

async function synthesizeOpenAI({ text, voice }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.status = 503;
    err.code = 'TTS_NOT_CONFIGURED';
    throw err;
  }
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_TTS_MODEL || 'tts-1-hd';
  const allowed = new Set(['alloy','ash','ballad','coral','echo','fable','onyx','nova','sage','shimmer','verse','marin','cedar']);
  const chosen = allowed.has(String(voice || '')) ? String(voice) : 'onyx';
  const response = await client.audio.speech.create({
    model,
    voice: chosen,
    input: String(text || '').trim(),
    response_format: 'mp3',
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('TTS returned empty audio');
  return buffer;
}

async function synthesizeGoogle({ text, voice }) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    const err = new Error('GOOGLE_TTS_API_KEY is not configured');
    err.status = 503;
    err.code = 'TTS_NOT_CONFIGURED';
    throw err;
  }
  const map = {
    onyx: 'ar-XA-Wavenet-B', echo: 'ar-XA-Wavenet-C', ash: 'ar-XA-Wavenet-C',
    nova: 'ar-XA-Wavenet-A', shimmer: 'ar-XA-Wavenet-A', alloy: 'ar-XA-Wavenet-B',
  };
  const voiceName = map[String(voice || '')] || 'ar-XA-Wavenet-B';
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: String(text || '').trim() },
      voice: { languageCode: 'ar-XA', name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  if (!res.ok) throw new Error(`Google TTS failed (${res.status})`);
  const data = await res.json();
  if (!data.audioContent) throw new Error('Google TTS returned empty audioContent');
  return Buffer.from(data.audioContent, 'base64');
}

function pickProviderName() {
  const preferred = String(process.env.TTS_PROVIDER || '').toLowerCase();
  if (preferred === 'google' && process.env.GOOGLE_TTS_API_KEY) return 'google';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_TTS_API_KEY) return 'google';
  return '';
}

function pickVoice(role, roleVoices = {}, narratorVoice = 'onyx') {
  if (roleVoices[role]) return roleVoices[role];
  if (role === 'راوي') return narratorVoice || 'onyx';
  return narratorVoice || 'onyx';
}

function safeFilename(storyId, episodeId) {
  const s = String(storyId || 'story').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'story';
  const e = String(episodeId || 'episode').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'episode';
  return `jazal-${s}-${e}.mp3`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    await verifyAdmin(req.headers.authorization || req.headers.Authorization);
    const body = await readJson(req);
    const text = body.text || body.script || '';
    const storyId = body.storyId || 'story';
    const episodeId = body.episodeId || 'episode';
    const narratorVoice = body.narratorVoice || 'onyx';
    const roleVoices = body.roleVoices && typeof body.roleVoices === 'object' ? body.roleVoices : {};
    const parsed = parseScript(text);
    const providerName = pickProviderName();
    if (!providerName) {
      const err = new Error('No TTS provider configured. Set OPENAI_API_KEY (recommended) or GOOGLE_TTS_API_KEY.');
      err.status = 503;
      err.code = 'TTS_NOT_CONFIGURED';
      throw err;
    }
    const synthesize = providerName === 'google' ? synthesizeGoogle : synthesizeOpenAI;
    const segmentBuffers = [];
    for (const segment of parsed.segments) {
      const voice = pickVoice(segment.role, roleVoices, narratorVoice);
      segmentBuffers.push(await synthesize({ text: segment.text, voice }));
    }
    const merged = mergeMp3(segmentBuffers);
    const filename = safeFilename(storyId, episodeId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Jazal-Audio-Filename', filename);
    res.setHeader('X-Jazal-Audio-Size', String(merged.size));
    res.setHeader('X-Jazal-Audio-Duration', String(merged.durationSec || 0));
    res.setHeader('X-Jazal-Audio-Format', 'mp3');
    res.setHeader('X-Jazal-Audio-Provider', providerName);
    res.setHeader('X-Jazal-Audio-Merge', merged.method);
    res.setHeader('X-Jazal-Audio-Segments', String(parsed.segments.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(merged.buffer);
  } catch (err) {
    console.error('[audio-generate]', err);
    return res.status(err.status || 500).json({
      ok: false,
      error: err.message || 'Audio generation failed',
      code: err.code || 'GENERATE_FAILED',
    });
  }
};
