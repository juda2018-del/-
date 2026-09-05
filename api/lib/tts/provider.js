/**
 * TTSProvider abstraction:
 *   synthesize({ text, voice }) => Promise<Buffer>
 *
 * Selection order:
 * 1) TTS_PROVIDER=openai|google
 * 2) OPENAI_API_KEY
 * 3) GOOGLE_TTS_API_KEY
 */
const { createOpenAIProvider } = require('./openai');
const { createGoogleProvider } = require('./google');

function envFlag(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

function getConfiguredProviders() {
  const list = [];
  // Read from environment only — never hardcode secrets.
  if (envFlag('OPENAI_API_KEY')) list.push('openai');
  if (envFlag('GOOGLE_TTS_API_KEY')) list.push('google');
  return list;
}

function createTTSProvider(preferred) {
  const choice = String(preferred || process.env.TTS_PROVIDER || '').toLowerCase();
  const available = getConfiguredProviders();
  if (!available.length) {
    const err = new Error('No TTS provider configured. Set OPENAI_API_KEY (recommended) or GOOGLE_TTS_API_KEY.');
    err.status = 503;
    err.code = 'TTS_NOT_CONFIGURED';
    throw err;
  }

  const pick = available.includes(choice) ? choice : available[0];
  if (pick === 'google') return createGoogleProvider();
  return createOpenAIProvider();
}

module.exports = { createTTSProvider, getConfiguredProviders };
