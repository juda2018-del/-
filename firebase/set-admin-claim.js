#!/usr/bin/env node
/**
 * Set Firebase Custom Claim `admin: true` for JAZAL.
 *
 * ONE COMMAND (after prerequisites):
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node firebase/set-admin-claim.js admin@yourdomain.com
 *
 * Prerequisites (one-time):
 *   1. Firebase Console → Project Settings → Service accounts → Generate new private key
 *   2. Save as serviceAccount.json OUTSIDE git (already in .gitignore patterns)
 *   3. npm install firebase-admin
 *   4. Create admin user in Firebase Authentication Console (Email/Password)
 */
let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.error('Missing firebase-admin. Run: npm install firebase-admin');
  process.exit(1);
}

const email = process.argv[2];
const verifyOnly = process.argv.includes('--verify');

if (!email) {
  console.error('Usage: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node firebase/set-admin-claim.js <admin-email> [--verify]');
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
  process.exit(1);
}

admin.initializeApp({ projectId: 'jazal-audio' });

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  if (verifyOnly) {
    const record = await admin.auth().getUser(user.uid);
    const isAdmin = record.customClaims?.admin === true;
    console.log(isAdmin ? `OK: ${email} has admin=true` : `NO: ${email} missing admin claim`);
    process.exit(isAdmin ? 0 : 1);
  }
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  const record = await admin.auth().getUser(user.uid);
  console.log(`Admin claim set for ${email} (uid: ${user.uid})`);
  console.log(`Verified claims: ${JSON.stringify(record.customClaims || {})}`);
  console.log('Next: sign out in JAZAL Admin → sign in again to refresh ID token.');
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
