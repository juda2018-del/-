# JAZAL Production Deploy

## 1. Vercel (Web)

Current production: https://jazal.vercel.app

The repo is configured for Vercel static output from `www/`:

- `buildCommand`: `npm run build`
- `outputDirectory`: `www`

### Option A — One-command link (recommended)

1. Create token: https://vercel.com/account/tokens
2. Copy Team ID from Vercel → Team **juda12** → Settings → General
3. Run:

```bash
export VERCEL_TOKEN=your_token
export VERCEL_ORG_ID=team_xxxxxxxx
npm run vercel:link
```

This links `juda2018-del/-` to project `prj_eAIzDeZ40S23Cf1bnLq91FVstQf0` and triggers production deploy.

### Option B — Vercel Dashboard (manual)

1. Vercel Dashboard → Project **JAZAL** → Settings → Git
2. Connect repository: `juda2018-del/-`
3. Production Branch: `main`
4. Build Command: `npm run build`
5. Output Directory: `www`
6. Redeploy production

### Option C — GitHub Actions

Add repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID` = `prj_eAIzDeZ40S23Cf1bnLq91FVstQf0`

Push to `main` runs `.github/workflows/vercel-production.yml` automatically.

### CLI deploy (if logged in)

```bash
npm install
npm run build
npx vercel link
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
