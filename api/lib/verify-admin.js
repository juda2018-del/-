/**
 * Verify Firebase ID token + admin custom claim (server-side only).
 * Uses Node crypto + Google securetoken x509 certs (no jose / no ESM require).
 * Compatible with Vercel Node CJS runtimes.
 */
const crypto = require('crypto');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'jazal-audio';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts = null;
let cachedCertsAt = 0;
const CERTS_TTL_MS = 60 * 60 * 1000;

function b64urlJson(part) {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return JSON.parse(Buffer.from(padded + pad, 'base64').toString('utf8'));
}

function b64urlToBuffer(part) {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

async function getGoogleCerts() {
  const now = Date.now();
  if (cachedCerts && now - cachedCertsAt < CERTS_TTL_MS) return cachedCerts;
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Failed to fetch Firebase certs (${res.status})`);
  cachedCerts = await res.json();
  cachedCertsAt = now;
  return cachedCerts;
}

function verifyRs256(tokenParts, publicCertPem) {
  const [headerB64, payloadB64, signatureB64] = tokenParts;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  return verifier.verify(publicCertPem, b64urlToBuffer(signatureB64));
}

async function verifyAdminToken(authorizationHeader = '') {
  const raw = String(authorizationHeader || '');
  const match = raw.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error('Authorization Bearer token required');
    err.status = 401;
    throw err;
  }
  const token = match[1].trim();
  if (!token) {
    const err = new Error('Empty auth token');
    err.status = 401;
    throw err;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }

  let header;
  let payload;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch (_) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }

  if (header.alg !== 'RS256' || !header.kid) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }

  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) {
    // refresh once in case of rotated keys
    cachedCerts = null;
    const fresh = await getGoogleCerts();
    if (!fresh[header.kid]) {
      const err = new Error('Invalid or expired Firebase token');
      err.status = 401;
      throw err;
    }
    if (!verifyRs256(parts, fresh[header.kid])) {
      const err = new Error('Invalid or expired Firebase token');
      err.status = 401;
      throw err;
    }
  } else if (!verifyRs256(parts, cert)) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const issuer = `https://securetoken.google.com/${PROJECT_ID}`;
  if (payload.aud !== PROJECT_ID || payload.iss !== issuer) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }
  if (typeof payload.sub !== 'string' || !payload.sub) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }
  if (typeof payload.exp === 'number' && payload.exp < nowSec) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }
  if (typeof payload.iat === 'number' && payload.iat > nowSec + 300) {
    const err = new Error('Invalid or expired Firebase token');
    err.status = 401;
    throw err;
  }

  if (payload.admin !== true) {
    const err = new Error('Admin custom claim required');
    err.status = 403;
    throw err;
  }

  return {
    uid: payload.user_id || payload.sub,
    email: payload.email || '',
    admin: true,
  };
}

module.exports = { verifyAdminToken, PROJECT_ID };
