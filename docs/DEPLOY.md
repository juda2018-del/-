# JAZAL Production Deploy

## 1. Vercel (Web)

Current production: https://jazal.vercel.app

The repo is configured for Vercel static output from `www/`:

- `buildCommand`: `npm run build`
- `outputDirectory`: `www`

### Link GitHub branch to production

1. Vercel Dashboard → Project **JAZAL** → Settings → Git
2. Connect repository: `juda2018-del/-`
3. Production Branch: `cursor/jazal-production-ready-c37b` (or merge PR #1 to `main` first)
4. Redeploy production

### CLI deploy (if logged in)

```bash
npm install
npm run build
npx vercel link          # select existing JAZAL project
npx vercel --prod
```

### Verify after deploy

```bash
curl -s https://jazal.vercel.app/app.js | rg signupAdmin
# should return nothing
curl -s https://jazal.vercel.app/app.js | rg "function isAdmin"
# should match
```

## 2. Firebase Rules

```bash
npm install
npx firebase login
npm run firebase:deploy:rules
```

Rules source:
- `firebase/firestore.rules`
- `firebase/storage.rules`

## 3. Admin Custom Claim (one command)

```bash
npm install firebase-admin
# Download service account JSON from Firebase Console (do NOT commit)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
npm run admin:claim -- admin@yourdomain.com
npm run admin:claim -- admin@yourdomain.com --verify
```

Then in JAZAL: Admin → sign out → sign in again.

## 4. Upload real content

Admin → Firebase → login → رفع البيانات / upload MP3 per episode.

Demo file `assets/jazal-demo.mp3` is preview-only.
