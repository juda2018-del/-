/**
 * POST /api/audio-generate
 * Admin-only Audio Studio generation endpoint.
 * Returns a real audio/mpeg MP3 (not a mock). Does not publish episodes.
 *
 * Uses shared CJS libs only (no jose / no ESM require) for Vercel Node.
 */
const { verifyAdminToken } = require('./lib/verify-admin');
const { parseScript } = require('./lib/script-parser');
const { mergeMp3Buffers } = require('./lib/merge-audio');
const { createTTSProvider, getConfiguredProviders } = require('./lib/tts/provider');

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
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

function safeHttpsUrl(value) {
  const url = String(value || '').trim();
  return url.startsWith('https://') ? url : '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    await verifyAdminToken(req.headers.authorization || req.headers.Authorization);
    const body = await readJson(req);
    const text = body.text || body.script || '';
    const storyId = body.storyId || 'story';
    const episodeId = body.episodeId || 'episode';
    const narratorVoice = body.narratorVoice || 'onyx';
    const roleVoices = body.roleVoices && typeof body.roleVoices === 'object' ? body.roleVoices : {};
    const musicUrl = safeHttpsUrl(body.musicUrl);
    const sfxUrls = (Array.isArray(body.sfxUrls) ? body.sfxUrls : [])
      .map(safeHttpsUrl)
      .filter(Boolean)
      .slice(0, 4);

    const parsed = parseScript(text);
    const providers = getConfiguredProviders();
    if (!providers.length) {
      const err = new Error('No TTS provider configured. Set OPENAI_API_KEY (recommended) or GOOGLE_TTS_API_KEY.');
      err.status = 503;
      err.code = 'TTS_NOT_CONFIGURED';
      throw err;
    }

    const provider = createTTSProvider();
    const segmentBuffers = [];
    for (const segment of parsed.segments) {
      const voice = pickVoice(segment.role, roleVoices, narratorVoice);
      segmentBuffers.push(await provider.synthesize({ text: segment.text, voice }));
    }

    const merged = await mergeMp3Buffers(segmentBuffers, { musicUrl, sfxUrls });
    if (!merged.buffer || !merged.buffer.length) {
      throw new Error('Merged audio is empty');
    }

    const filename = safeFilename(storyId, episodeId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Jazal-Audio-Filename', filename);
    res.setHeader('X-Jazal-Audio-Size', String(merged.size));
    res.setHeader('X-Jazal-Audio-Duration', String(merged.durationSec || 0));
    res.setHeader('X-Jazal-Audio-Format', 'mp3');
    res.setHeader('X-Jazal-Audio-Provider', provider.name);
    res.setHeader('X-Jazal-Audio-Merge', merged.method);
    res.setHeader('X-Jazal-Audio-Segments', String(parsed.segments.length));
    res.setHeader('Cache-Control', 'no-store');
    // Generation never publishes — response is draft MP3 only.
    res.setHeader('X-Jazal-Audio-Publish', 'false');
    return res.status(200).send(merged.buffer);
  } catch (err) {
    // Never log Authorization headers or API keys.
    console.error('[audio-generate]', err.code || err.status || 500, err.message || String(err));
    return res.status(err.status || 500).json({
      ok: false,
      error: err.message || 'Audio generation failed',
      code: err.code || 'GENERATE_FAILED',
    });
  }
};
