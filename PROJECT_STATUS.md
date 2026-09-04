# PROJECT_STATUS — JAZAL / جَزَل

## PROJECT
JAZAL (جَزَل) — بودكاست وقصص صوتية (Web + Capacitor iOS/Android)

## REPOSITORY
`juda2018-del/-` (اسم المستودع على GitHub هو `-`)

## BRANCH
`cursor/master-audit-jazal-harden-a125` (أحدث عمل تدقيق) · default: `main`

## LATEST COMMIT
يُحدَّث مع كل push — آخر `main` قبل التدقيق: `7e2e730` — fix: repair production audio studio ESM auth flow

## STACK
- Vanilla JS SPA (`app.js`) + CSS + PWA service worker
- Vercel static (`www/`) + serverless `api/audio-*`
- Firebase Auth / Firestore / Storage — project `jazal-audio`
- Capacitor 6 — Bundle ID `iq.jeeltech.jazal`
- OpenAI TTS (server-side) عبر Audio Studio

## CURRENT STATUS
Production web live. Admin writes محمية بـ Firebase custom claim + server verify. UI بوابة الأدمن قُسّيت لإخفاء تبويبات الإدارة عن غير الأدمن.

## BUILD STATUS
PASS — `npm run launch` (build + lint + typecheck + security + audio smoke) ✅

## DEPLOYMENT STATUS
- Vercel production: **LIVE** — https://jazal.vercel.app (`deploy:verify` ✅)
- Preview: https://temporary-prompt-bugle-ugzt59v.vercel.app
- GitHub Pages: **BLOCKED** — Pages site غير مفعّل؛ workflow كان يفشل عند `enablement:true` (صلاحية integration)
- Firebase Hosting: **DOWN** — https://jazal-audio.web.app → 404
- New deploy from this agent: **BLOCKED** — missing `VERCEL_TOKEN` / `VERCEL_ORG_ID`

## DATABASE STATUS
Firestore `jazal/content` — قراءة عامة، كتابة `admin` claim فقط (rules في `firebase/firestore.rules`)

## AUTH STATUS
- مستمع: ضيف / بدون تسجيل مطلوب للقراءة
- أدمن: Email/Password + custom claim `admin:true`
- API `/api/audio-generate`: يرفض بدون Bearer (401 مُتحقق)

## MAIN FEATURES
Home · Library · Story detail · Player · FM · Submit · Account · Admin studio · Audio Studio (TTS) · Plans · Privacy/Terms/Support/About · PWA · Capacitor

## BUGS FOUND
1. GitHub Pages workflow فاشل (enablement بدون صلاحية) — جارٍ إصلاح workflow
2. Firebase Hosting غير منشور
3. TTS غير مُعدّ على الإنتاج (`ttsConfigured:false`) — يحتاج `OPENAI_API_KEY` على Vercel
4. وثائق LIVE كانت تشير لمعاينة بدل الدومين الإنتاجي — صُحّحت
5. واجهة الأدمن كانت تعرض شريط تبويبات الإدارة للزائر (بدون صلاحية كتابة) — hardened

## BUGS FIXED
1. إخفاء تبويبات/واجهة إدارة المحتوى عن غير الأدمن (`adminView` gate)
2. إزالة `enablement:true` من Pages workflow + Node 22
3. مزامنة `docs/LIVE.md` مع الإنتاج المُتحقَّق

## REMAINING BLOCKERS
| Blocker | Permission needed |
|---------|-------------------|
| Deploy جديد إلى Vercel | `VERCEL_TOKEN`, `VERCEL_ORG_ID` (Cursor Secrets أو env) |
| تفعيل GitHub Pages | Owner: Settings → Pages → Source = GitHub Actions |
| Firebase Hosting | `firebase login` / service account + `firebase deploy --only hosting` |
| TTS حقيقي في Audio Studio | `OPENAI_API_KEY` (أو `GOOGLE_TTS_API_KEY`) على Vercel env |
| Admin claim لحسابك | Firebase Console + `npm run admin:claim` مع service account |

## NEXT ACTIONS
1. إضافة أسرار Vercel/TTS ثم `npm run vercel:prebuilt` + `deploy:verify`
2. تفعيل GitHub Pages يدوياً وإعادة تشغيل workflow
3. نشر Firebase Hosting إن رغبت بنسخة احتياطية
4. بناء iOS/Android عبر Xcode / Android Studio (`cap:sync`)

## PRODUCTION READINESS %
**82%** — Web core جاهز ومُختبر في المتصفح؛ النشر الثانوي (Pages/Firebase Hosting) وTTS وأسرار النشر ما زالت BLOCKED.
