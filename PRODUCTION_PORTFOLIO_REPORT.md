# Production Portfolio Report — juda2018-del

**Generated:** 2026-09-05  
**Agent:** Cursor Cloud (`bc-01a07085-7c63-77c8-9953-ab6dd0f631e6`)  
**Writable GitHub scope:** `juda2018-del/-` only  
**Visible public repos:** `juda2018-del/-`, `juda2018-del/juda-food-app`, `juda2018-del/jeel-tech-website`

---

## Access boundary (evidence)

| Target | Result |
|--------|--------|
| `juda2018-del/-` (JAZAL) | clone + push OK |
| `juda2018-del/juda-food-app` (FUSE) | clone OK · push **403** (`cursor[bot]`) |
| `juda2018-del/suqly-ai` | **404** |
| `juda2018-del/joda-os` | **404** |
| `juda2018-del/jardak-ai` | **404** |
| `juda2018-del/fancy-hub-app` | **404** |
| `juda2018-del/jazal-app` | **404** (JAZAL lives as repo `-`) |

Secrets present in this agent environment: **none** (`VERCEL_TOKEN`, `OPENAI_API_KEY`, Apple/Android signing, Firebase admin).

---

## 1) JAZAL / جَزَل

| Field | Value |
|-------|-------|
| PROJECT | JAZAL |
| REPO | `juda2018-del/-` |
| CURRENT COMMIT (working) | branch `cursor/jazal-production-ready-31e6` includes `a6233af` (PR #20) + follow-up CI harden |
| CURRENT STATE | Web Production LIVE; CI green when Pages/Vercel secrets missing |
| CHANGES MADE | Merged PR #20 Pages/CI skip logic; hardened `vercel-production.yml` to skip without secrets; refreshed portfolio report |
| TESTS | `npm run launch` PASS · `node scripts/verify-production.js` PASS |
| BUILD STATUS | PASS |
| CI STATUS | launch-check SUCCESS on PR #20; Pages was failing on main — fixed by skip-until-enabled |
| DEPLOYMENT STATUS | https://jazal.vercel.app LIVE · Pages 404 · Firebase Hosting 404 |
| REAL BLOCKERS | None for core listening web |
| NEEDS CREDENTIAL | `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` (new deploys) · `OPENAI_API_KEY` (TTS) · Pages enablement · `ANDROID_HOME` / Xcode for native store builds · Apple/Android signing |
| NEXT ACTION | Add secrets → redeploy → enable Pages → Codemagic/Xcode native builds |

Evidence: `/api/audio-health` → `ok:true`, `ttsConfigured:false`.

---

## 2) FUSE / فيوز

| Field | Value |
|-------|-------|
| PROJECT | FUSE |
| REPO | `juda2018-del/juda-food-app` |
| CURRENT COMMIT | `3b60260` on `main` |
| CURRENT STATE | Web LIVE · local `tsc`/`lint`/`build` PASS · Firestore canonical catalog PASS · **add-to-cart blocked on live UI** |
| CHANGES MADE | **None pushed** (write 403). Fix prepared locally + patch in `patches/fuse-prefer-canonical-menu.patch`. |
| TESTS | `npx tsc --noEmit` PASS · `npm run lint` PASS · `npm run build` PASS · `npm run check:catalog` PASS · browser smoke on fuseiraq.com |
| BUILD STATUS | PASS (local clone) |
| CI STATUS | Obsolete workflow `apply-mobile-responsive-fix.yml` last failed 2026-07-23 (corrupt gzip). Patch to delete: `patches/fuse-disable-obsolete-mobile-workflow.patch`. |
| DEPLOYMENT STATUS | https://juda-food-app.vercel.app + https://www.fuseiraq.com LIVE |
| REAL BLOCKERS | **Cart:** restaurant detail lists legacy `menu` docs (random IDs / Arabic name match) alongside canonical docs. `menuLive=true` but add fails for non-canonical IDs. **Push 403** prevents shipping the filter fix. |
| NEEDS CREDENTIAL | GitHub write for agent · Codemagic/App Store Connect · Android keystore · optional payment gateway |
| NEXT ACTION | Grant write → apply `patches/fuse-prefer-canonical-menu.patch` → redeploy → retest add-to-cart → Codemagic |

Browser smoke (2026-09-05): Home/Restaurants/Reels/Profile/Cart OK · RTL · single bottom nav · Profile does not hang · Add-to-cart toast: «المنيو غير متصل…» when clicking legacy rows (باكلة/بورك). Canonical docs `fayrouz-kahi` etc. exist in Firestore with `restaurantId`. `/checkout` and `/account` 404 by design (checkout in `/cart`, account=`/profile`).

---

## 3) SUQLY AI

| Field | Value |
|-------|-------|
| PROJECT | SUQLY AI |
| REPO | `juda2018-del/suqly-ai` — **not visible** |
| CURRENT COMMIT | unknown |
| CURRENT STATE | Product LIVE at https://www.suqly.cloud — routes `/owner` `/admin` `/supervisor` `/signup` `/plans` `/checkout` `/payment-pending` `/start` `/connections` `/privacy` `/terms` `/data-deletion` all HTTP 200 |
| CHANGES MADE | None (no repo access) |
| TESTS | Public HTTP smoke only |
| BUILD STATUS | unknown |
| CI STATUS | unknown |
| DEPLOYMENT STATUS | LIVE web · `/api/health` → **HTTP 500** (Next error page) |
| REAL BLOCKERS | No GitHub access · production `/api/health` failing |
| NEEDS CREDENTIAL | Connect private repo to Cursor Cloud Agent · Vercel env for health/integrations |
| NEXT ACTION | Owner grants repo access → fix `/api/health` 500 → verify integrations show NEEDS CREDENTIAL not fake SUCCESS |

Browser smoke: marketing/home, `/plans`, `/privacy` load. Guest dashboard shows numeric widgets (engagement/followers) — **treat as unverified marketing UI until repo proves live data**. `/api/health` remains HTTP 500.

---

## 4) JODA OS

| Field | Value |
|-------|-------|
| PROJECT | JODA OS |
| REPO | `juda2018-del/joda-os` — **not visible** |
| CURRENT COMMIT | unknown (live reports `version: 0.2.0`) |
| CURRENT STATE | https://joda-os.vercel.app LIVE · Postgres CONNECTED · auth configured · AI/search/execution not fully wired |
| CHANGES MADE | None (no repo access) |
| TESTS | Public API smoke |
| BUILD STATUS | unknown from GH |
| CI STATUS | unknown |
| DEPLOYMENT STATUS | LIVE · `/api/health` 200 · protected APIs return 401 without auth (expected) |
| REAL BLOCKERS | No GitHub access for code fixes · cannot run autonomous agent E2E without credentials |
| NEEDS CREDENTIAL | Repo access · `JODA_AI_URL` + `JODA_AI_API_KEY` · `JODA_SEARCH_*` / `TAVILY_API_KEY` · `JODA_EXECUTION_*` · owner login for authenticated API tests |
| NEXT ACTION | Grant repo access → authenticated E2E of Observe→…→Learn · keep REAL EVIDENCE vs PROJECTION separation |

Health snippet: `ai.status=NOT CONFIGURED`, `search.status=NEEDS CREDENTIAL`, `execution.status=AWAITING INTEGRATION`, `database=CONNECTED`, `productionReady=true` (with optional blockers listed).

---

## 5) JARDAK AI

| Field | Value |
|-------|-------|
| PROJECT | JARDAK AI |
| REPO | `juda2018-del/jardak-ai` — **not visible** |
| CURRENT COMMIT | unknown |
| CURRENT STATE | https://jardak-ai.vercel.app LIVE (static/web) · `/api/health` 404 |
| CHANGES MADE | None |
| TESTS | Public HTTP smoke |
| BUILD STATUS | unknown |
| CI STATUS | unknown |
| DEPLOYMENT STATUS | LIVE web shell |
| REAL BLOCKERS | No GitHub access · cannot produce APK/AAB without source + Android SDK/signing |
| NEEDS CREDENTIAL | Repo access · Android SDK · keystore · Play credentials |
| NEXT ACTION | Connect repo → web build → Capacitor Android release pipeline |

Browser smoke: login shell + bottom nav load. Routes in HTML include `/onboarding` `/business` `/ai-scan` `/plans` `/launch-status`. No APK produced here.

---

## 6) FANCY HUB

| Field | Value |
|-------|-------|
| PROJECT | FANCY HUB |
| REPO | `juda2018-del/fancy-hub-app` — **not visible** |
| CURRENT COMMIT | unknown |
| CURRENT STATE | https://fancy-hub.vercel.app LIVE («The Fancy House») · `/products` `/cart` `/checkout` HTTP 404 (likely client-router / different paths) |
| CHANGES MADE | None |
| TESTS | Public HTTP smoke |
| BUILD STATUS | unknown |
| CI STATUS | unknown |
| DEPLOYMENT STATUS | LIVE marketing/e-com shell |
| REAL BLOCKERS | No GitHub access · cannot verify Capacitor `iq.fancyhub.app` / `com.fancyhub.app` without source |
| NEEDS CREDENTIAL | Repo access · Apple/Android signing · Codemagic · Firebase if private |
| NEXT ACTION | Connect repo → full commerce + native audit |

Browser smoke: Neon «The Fancy House» UI + Products listing with prices/Order Now (WhatsApp-style CTA). Direct `/products` `/cart` `/checkout` HTTP 404 — client nav, not Next routes. Bundle ids unverified without source.

---

## Priority actions for the owner

1. **Grant Cursor Cloud Agent write** on `juda-food-app` and connect private repos: `suqly-ai`, `joda-os`, `jardak-ai`, `fancy-hub-app`.
2. **Add secrets** to this environment / Vercel: `VERCEL_TOKEN`, TTS/AI keys as needed.
3. **Enable GitHub Pages** on `juda2018-del/-` if secondary host wanted.
4. **Investigate SUQLY `/api/health` 500** after repo access.
5. **Do not claim App Store / Play Store READY** until real signed builds exist.
