#!/usr/bin/env node
/**
 * One-time admin setup for jazal-audio.
 *
 * Prerequisites:
 *   1. Download a Firebase service account JSON for project jazal-audio
 *   2. npm install firebase-admin
 *   3. export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *
 * Usage:
 *   node firebase/set-admin-claim.js admin@yourdomain.com
 */
const admin = require('firebase-admin');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node firebase/set-admin-claim.js <admin-email>');
  process.exit(1);
}

admin.initializeApp({ projectId: 'jazal-audio' });

admin.auth().getUserByEmail(email)
  .then(user => admin.auth().setCustomUserClaims(user.uid, { admin: true }))
  .then(() => {
    console.log(`Admin claim set for ${email}. Ask the user to sign out and sign in again.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err.message || err);
    process.exit(1);
  });
