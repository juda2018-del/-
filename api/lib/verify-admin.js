/**
 * Verify Firebase ID token + admin custom claim (server-side only).
 * Uses Google securetoken JWKS — no service account required for verification.
 */
const { createRemoteJWKSet, jwtVerify } = require('jose');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'jazal-audio';
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

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

  let payload;
  try {
    const verified = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    payload = verified.payload;
  } catch (e) {
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
