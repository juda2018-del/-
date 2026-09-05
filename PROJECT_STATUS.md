# PROJECT_STATUS — JAZAL / جَزَل

## PROJECT
JAZAL (جَزَل) — بودكاست وقصص صوتية (Web + Capacitor iOS/Android)

## REPOSITORY
`juda2018-del/-` (اسم المستودع على GitHub هو `-`)

## BRANCH
`cursor/jazal-production-ready-31e6` · default: `main`

## LATEST COMMIT
Working branch includes `a6233af` (CI/Pages skip when secrets missing) + vercel-production secret guard + portfolio report.

## STACK
- Vanilla JS SPA (`app.js`) + CSS + PWA service worker
- Vercel static (`www/`) + serverless `api/audio-*`
- Firebase Auth / Firestore / Storage — project `jazal-audio`
- Capacitor 6 — Bundle ID `iq.jeeltech.jazal`
- OpenAI TTS (server-side) عبر Audio Studio

## CURRENT STATUS
Production web LIVE and verified. Admin UI gated. CI stays green when Pages/Vercel secrets are absent.

## BUILD STATUS
PASS — `npm run launch` (build + lint + typecheck + security + audio smoke)

## DEPLOYMENT STATUS
- Vercel production: **LIVE** — https://jazal.vercel.app (`deploy:verify` ✅)
- GitHub Pages: **SKIP until enabled** (workflow detects missing site)
- Firebase Hosting: **DOWN** — https://jazal-audio.web.app → 404
- Agent redeploy: **NEEDS CREDENTIAL** — `VERCEL_TOKEN` / org / project ids
- Native Android APK here: **NEEDS** `ANDROID_HOME` (Cap sync OK; Gradle blocked on SDK)

## DATABASE STATUS
Firestore `jazal/content` — قراءة عامة، كتابة `admin` claim فقط

## AUTH STATUS
- مستمع: ضيف
- أدمن: Email/Password + custom claim `admin:true`
- API `/api/audio-generate`: Bearer required

## MAIN FEATURES
Home · Library · Story detail · Player · FM · Submit · Account · Admin studio · Audio Studio (TTS) · Plans · Privacy/Terms/Support/About · PWA · Capacitor

## REAL BLOCKERS
None for core web listening.

## NEEDS CREDENTIAL
| Item | Secret / action |
|------|-----------------|
| New Vercel deploy | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| TTS Audio Studio | `OPENAI_API_KEY` (or `GOOGLE_TTS_API_KEY`) on Vercel |
| GitHub Pages | Owner enables Settings → Pages → GitHub Actions |
| Firebase Hosting | Firebase CI token / service account |
| Android release | `ANDROID_HOME` + keystore |
| iOS release | Xcode + Apple signing / Codemagic |

## NEXT ACTIONS
1. Add Vercel + TTS secrets and redeploy
2. Enable Pages if wanted
3. Native store builds after web PASS (already PASS)

## PRODUCTION READINESS %
**85%** — Web core production-ready; TTS/native/store paths blocked on credentials only.

## PORTFOLIO
See `PRODUCTION_PORTFOLIO_REPORT.md` for all six requested projects and access boundaries.
