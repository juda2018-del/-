/**
 * Parse episode scripts with optional role tags:
 *   [راوي]
 *   كان الليل هادئاً...
 *   [أحمد]
 *   أين نحن؟
 */
const MAX_TEXT_CHARS = 12000;
const MAX_SEGMENT_CHARS = 3800;

function sanitizeRole(role = '') {
  return String(role).trim().replace(/^\[|\]$/g, '').slice(0, 80) || 'راوي';
}

function chunkText(text, max = MAX_SEGMENT_CHARS) {
  const value = String(text || '').trim();
  if (!value) return [];
  if (value.length <= max) return [value];
  const parts = [];
  let remaining = value;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function parseScript(text = '') {
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

  const flush = () => {
    const body = buffer.join('\n').trim();
    buffer = [];
    if (!body) return;
    chunkText(body).forEach((chunk) => {
      segments.push({ role: currentRole, text: chunk });
    });
  };

  for (const line of lines) {
    const m = line.match(roleLine);
    if (m) {
      flush();
      currentRole = sanitizeRole(m[1]);
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

  const roles = [...new Set(segments.map((s) => s.role))];
  return { segments, roles, charCount: raw.length };
}

module.exports = { parseScript, chunkText, sanitizeRole, MAX_TEXT_CHARS };
