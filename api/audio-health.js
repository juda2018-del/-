/** GET /api/audio-health — TTS readiness without secrets */
const { getConfiguredProviders } = require('./lib/tts/provider');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const providers = getConfiguredProviders();
  return res.status(200).json({
    ok: true,
    service: 'jazal-audio-studio',
    ttsConfigured: providers.length > 0,
    providers,
    endpoints: {
      health: '/api/audio-health',
      generate: '/api/audio-generate',
      healthAlias: '/api/audio-studio/health',
      generateAlias: '/api/audio-studio/generate',
    },
    maxTextChars: 12000,
    workflow: ['generate', 'preview', 'download', 'attach', 'publish'],
    note: 'Generate returns draft MP3 only. Publish is a separate admin action.',
  });
};
