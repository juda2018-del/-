/** GET /api/audio-health — TTS readiness without secrets */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const providers = [];
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.GOOGLE_TTS_API_KEY) providers.push('google');
  return res.status(200).json({
    ok: true,
    service: 'jazal-audio-studio',
    ttsConfigured: providers.length > 0,
    providers,
    endpoints: {
      health: '/api/audio-health',
      generate: '/api/audio-generate',
    },
    maxTextChars: 12000,
    workflow: ['generate', 'preview', 'download', 'attach', 'publish'],
  });
};
