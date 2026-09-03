/**
 * OpenAI TTS provider — returns real MP3 Buffer.
 * API key stays server-side only (OPENAI_API_KEY).
 */
const OpenAI = require('openai');

const OPENAI_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar'
]);

function createOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.status = 503;
    err.code = 'TTS_NOT_CONFIGURED';
    throw err;
  }
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_TTS_MODEL || 'tts-1-hd';

  return {
    name: 'openai',
    voices: [...OPENAI_VOICES],
    async synthesize({ text, voice }) {
      const input = String(text || '').trim();
      if (!input) throw new Error('Empty TTS input');
      const chosen = OPENAI_VOICES.has(String(voice || '')) ? String(voice) : 'onyx';
      const response = await client.audio.speech.create({
        model,
        voice: chosen,
        input,
        response_format: 'mp3',
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer[0] !== 0xff) {
        // MP3 frames typically start with 0xFF; OpenAI ID3 may start with 'ID3'
        const looksMp3 = buffer.length > 100 && (buffer[0] === 0xff || buffer.slice(0, 3).toString() === 'ID3');
        if (!looksMp3) throw new Error('TTS provider returned unexpected audio payload');
      }
      return buffer;
    },
  };
}

module.exports = { createOpenAIProvider, OPENAI_VOICES };
