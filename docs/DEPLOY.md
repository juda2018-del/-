# JAZAL Production Deploy

## 0. Auto deploy (Cloud Agent / CI)

When secrets are available in the environment:

```bash
npm run deploy:auto
```

Required secrets (add in **Cursor → Cloud Agent → Environment → Secrets**):

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel API token from https://vercel.com/account/tokens (**not** a `vcn_*` claim token) |
| `VERCEL_ORG_ID` | Team juda12 ID (`team_…`) |
| `VERCEL_PROJECT_ID` | `prj_9e9ngS2Ku57628F3qUUtDgz6SN55` (مشروع Fusion v3 بعد Claim) أو `prj_eAIzDeZ40S23Cf1bnLq91FVstQf0` (قديم) |
| `VERCEL_DEPLOY_HOOK` | Redeploy after Git is linked |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON |

## 1. Vercel (Web)

Current production: https://jazal.vercel.app

The repo is configured for Vercel static output from `www/`:

- `buildCommand`: `npm run build`
- `outputDirectory`: `www`

### Quick links (team juda12)

| Action | Link |
|--------|------|
| Connect Git to JAZAL | https://vercel.com/juda12/jazal/settings/git |
| Claim latest build (no token) | Run `npm run deploy:preview` and open the printed claim URL |
| Preview (Fusion v3) | Run `npm run deploy:preview` — latest `temporary-*.vercel.app` |

### Option A — One-command deploy (recommended)

1. Create token: https://vercel.com/account/tokens
2. Copy Team ID from Vercel → Team **juda12** → Settings → General (`team_…`)
3. Add both as **Cursor Cloud Agent secrets** (`VERCEL_TOKEN`, `VERCEL_ORG_ID`) or export locally:

```bash
export VERCEL_TOKEN=your_token
export VERCEL_ORG_ID=team_xxxxxxxx
npm run vercel:prebuilt
npm run deploy:verify
```

Or link Git + deploy:

```bash
npm run vercel:link
```

This links `juda2018-del/-` to project `prj_eAIzDeZ40S23Cf1bnLq91FVstQf0` and triggers production deploy.

### Option B — Vercel Dashboard (manual)

1. Open https://vercel.com/juda12/jazal/settings/git
2. Connect repository: `juda2018-del/-`
3. Production Branch: `main`
4. Build Command: `npm run build`
5. Output Directory: `www`
6. Redeploy production

### Option C — Deploy Hook (after Git is linked)

1. Vercel → JAZAL → Settings → Git → **Deploy Hooks** → create hook for branch `main`
2. Add GitHub secret `VERCEL_DEPLOY_HOOK` with the hook URL
3. Every push to `main` auto-redeploys via `.github/workflows/vercel-deploy-hook.yml`

Or run manually:

```bash
export VERCEL_DEPLOY_HOOK=https://api.vercel.com/v1/integrations/deploy/...
npm run vercel:deploy
```

### Option D — GitHub Actions (full API deploy)

Add repository secrets (Settings → Secrets and variables → Actions):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID` = `prj_eAIzDeZ40S23Cf1bnLq91FVstQf0`

Run **Actions → Vercel Production → Run workflow** after secrets are set.

### Option E — Claim anonymous deploy (no token)

```bash
npm run build
npx vercel deploy --temporary --yes
```

Open the printed `claimUrl` while logged into team **juda12**, select project **JAZAL**, and assign to production domain `jazal.vercel.app`.

### CLI deploy (if logged in)

```bash
npm install
npm run build
npx vercel link
npx vercel --prod
```

### Verify after deploy

```bash
npm run deploy:verify
# or
curl -s https://jazal.vercel.app/app.js | rg jazal-fusion-v3
curl -s https://jazal.vercel.app/app.js | rg createUserWithEmailAndPassword
# should return nothing
```

## 1b. GitHub Pages (auto on push to main)

After merging, enable **Settings → Pages → Source: GitHub Actions**.

Live URL: **https://juda2018-del.github.io/-/**

## 1c. Firebase Hosting (alternative web URL)

If Vercel is not linked yet, you can publish the same build to Firebase:

```bash
npm install
npx firebase login
npm run firebase:deploy:hosting
```

Live URL: https://jazal-audio.web.app (or https://jazal-audio.firebaseapp.com)

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
