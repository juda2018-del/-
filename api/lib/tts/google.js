/**
 * Google Cloud Text-to-Speech provider (optional fallback).
 * Uses GOOGLE_TTS_API_KEY server-side only.
 */
const GOOGLE_VOICE_MAP = {
  alloy: 'ar-XA-Wavenet-B',
  onyx: 'ar-XA-Wavenet-B',
  echo: 'ar-XA-Wavenet-C',
  ash: 'ar-XA-Wavenet-C',
  nova: 'ar-XA-Wavenet-A',
  shimmer: 'ar-XA-Wavenet-A',
  coral: 'ar-XA-Wavenet-D',
  sage: 'ar-XA-Wavenet-D',
  fable: 'ar-XA-Wavenet-B',
  ballad: 'ar-XA-Wavenet-A',
};

function createGoogleProvider() {
  const apiKey = String(process.env.GOOGLE_TTS_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('GOOGLE_TTS_API_KEY is not configured');
    err.status = 503;
    err.code = 'TTS_NOT_CONFIGURED';
    throw err;
  }

  return {
    name: 'google',
    voices: Object.keys(GOOGLE_VOICE_MAP),
    async synthesize({ text, voice }) {
      const input = String(text || '').trim();
      if (!input) throw new Error('Empty TTS input');
      const voiceName = GOOGLE_VOICE_MAP[String(voice || '')] || 'ar-XA-Wavenet-B';
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: input },
          voice: { languageCode: 'ar-XA', name: voiceName },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Google TTS failed (${res.status}): ${detail.slice(0, 180)}`);
      }
      const data = await res.json();
      if (!data.audioContent) throw new Error('Google TTS returned empty audioContent');
      return Buffer.from(data.audioContent, 'base64');
    },
  };
}

module.exports = { createGoogleProvider, GOOGLE_VOICE_MAP };
