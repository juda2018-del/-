/**
 * POST /api/audio-studio/generate
 * Admin-only: script → TTS segments → merge → final MP3 binary.
 * Does NOT publish episodes. Returns audio/mpeg for download/export.
 */
const { verifyAdminToken } = require('../lib/verify-admin');
const { parseScript } = require('../lib/script-parser');
const { createTTSProvider } = require('../lib/tts/provider');
const { mergeMp3Buffers } = require('../lib/merge-audio');

const DEFAULT_ROLE_VOICES = {
  'راوي': 'onyx',
  'narrator': 'onyx',
  'آدم': 'echo',
  'سامي': 'ash',
  'أحمد': 'echo',
  'سارة': 'nova',
};

function pickVoice(role, roleVoices = {}, narratorVoice = 'onyx') {
  if (roleVoices[role]) return roleVoices[role];
  const lower = String(role).toLowerCase();
  if (DEFAULT_ROLE_VOICES[role]) return DEFAULT_ROLE_VOICES[role];
  if (DEFAULT_ROLE_VOICES[lower]) return DEFAULT_ROLE_VOICES[lower];
  if (role === 'راوي' || lower.includes('narr')) return narratorVoice || 'onyx';
  return narratorVoice || 'onyx';
}

function safeFilename(storyId, episodeId) {
  const s = String(storyId || 'story').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'story';
  const e = String(episodeId || 'episode').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'episode';
  return `jazal-${s}-${e}.mp3`;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return {};
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    await verifyAdminToken(req.headers.authorization || req.headers.Authorization);

    const body = readBody(req);
    const text = body.text || body.script || '';
    const storyId = body.storyId || 'story';
    const episodeId = body.episodeId || 'episode';
    const narratorVoice = body.narratorVoice || 'onyx';
    const roleVoices = body.roleVoices && typeof body.roleVoices === 'object' ? body.roleVoices : {};
    const musicUrl = body.musicUrl || '';
    const sfxUrls = Array.isArray(body.sfxUrls) ? body.sfxUrls : [];
    const musicVolume = body.musicVolume;

    const parsed = parseScript(text);
    const provider = createTTSProvider(body.provider);

    const segmentBuffers = [];
    for (const segment of parsed.segments) {
      const voice = pickVoice(segment.role, roleVoices, narratorVoice);
      const buf = await provider.synthesize({ text: segment.text, voice });
      segmentBuffers.push(buf);
    }

    const merged = await mergeMp3Buffers(segmentBuffers, { musicUrl, sfxUrls, musicVolume });
    const filename = safeFilename(storyId, episodeId);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Jazal-Audio-Filename', filename);
    res.setHeader('X-Jazal-Audio-Size', String(merged.size));
    res.setHeader('X-Jazal-Audio-Duration', String(merged.durationSec || 0));
    res.setHeader('X-Jazal-Audio-Format', 'mp3');
    res.setHeader('X-Jazal-Audio-Provider', provider.name);
    res.setHeader('X-Jazal-Audio-Merge', merged.method || 'unknown');
    res.setHeader('X-Jazal-Audio-Segments', String(parsed.segments.length));
    res.setHeader('X-Jazal-Audio-Roles', encodeURIComponent(parsed.roles.join(',')));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(merged.buffer);
  } catch (err) {
    const status = err.status || 500;
    console.error('[audio-studio/generate]', err);
    return res.status(status).json({
      ok: false,
      error: err.message || 'Audio generation failed',
      code: err.code || 'GENERATE_FAILED',
    });
  }
}

handler.config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

module.exports = handler;
