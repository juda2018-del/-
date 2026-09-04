# MASTER PROJECT REPORT

**Date:** 2026-09-04  
**Evidence sources:** GitHub CLI/API · local git · `npm run launch` / `next build` · production HTTP · browser QA screenshots under `/opt/cursor/artifacts/`

---

## Totals

| Metric | Count |
|--------|-------|
| TOTAL REPOSITORIES (visible to token) | **3** |
| PRODUCTION PROJECTS (live URLs) | **5+** (JAZAL, FUSE×2 domains, JEEL, SUQLY, Fancy Hub) |
| BROKEN PROJECTS (core flow) | **1** — FUSE cart/order |
| BLOCKED PROJECTS (no GH / no secrets) | **4+** — suqly-ai, fancy-hub-app, jarda, joda-os (+ writes on FUSE/JEEL) |
| READY PROJECTS (web usable) | **2** — JAZAL (~82%), JEEL (~95%) |

### Priority buckets

- **P0:** FUSE Iraq (ordering broken) · Grant write access to private/priority repos
- **P1:** JAZAL (harden + secrets) · SUQLY AI · Fancy Hub (need GH)
- **P2:** JEEL TECH polish
- **P3:** JARDAK AI · JODA OS (not found)

---

## Per project

⸻

### PROJECT: JAZAL / جَزَل
- **REPO:** `juda2018-del/-`
- **BRANCH:** `cursor/master-audit-jazal-harden-a125`
- **LAST COMMIT (main before fixes):** `7e2e730`
- **STATUS:** Production web LIVE; secondary hosts BLOCKED
- **BUILD:** PASS — `npm run launch`
- **DEPLOYMENT:** Vercel LIVE · Pages BLOCKED · Firebase Hosting 404 · agent deploy BLOCKED (no `VERCEL_TOKEN`)
- **PRODUCTION URL:** https://jazal.vercel.app
- **READINESS:** **82%**
- **CRITICAL BUGS:** Pages workflow enablement failure; TTS env missing; Hosting unpublished
- **FIXED (this agent):**
  - Admin UI gate — hide admin tabs for non-admins (`app.js`)
  - Pages workflow — remove `enablement:true`, Node 22
  - `docs/LIVE.md` aligned to verified prod URL
  - Added `PROJECT_STATUS.md` + `MASTER_INVENTORY.md`
- **REMAINING:** Vercel/TTS secrets · owner enables Pages · Firebase Hosting deploy · mobile store builds
- **NEXT ACTION:** Add Cursor secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `OPENAI_API_KEY` then redeploy + verify

⸻

### PROJECT: FUSE Iraq / فيوز
- **REPO:** `juda2018-del/juda-food-app`
- **BRANCH:** `main`
- **LAST COMMIT:** `3b60260` — rebuild FUSE customer UI
- **STATUS:** Site LIVE; **core order path broken**
- **BUILD:** PASS locally (`npm ci`, `next build`, `eslint`, `tsc`)
- **DEPLOYMENT:** Vercel Production (juda-food-app + fuse-iraq) · https://www.fuseiraq.com
- **PRODUCTION URL:** https://juda-food-app.vercel.app
- **READINESS:** **65–75%** (UI OK, ordering blocked)
- **CRITICAL BUGS:** Add-to-cart → «المنتج غير متصل بقاعدة البيانات…» (Firestore catalog/menu link)
- **FIXED:** none (agent **cannot push** — 403 `cursor[bot]`)
- **REMAINING:** Seed/link Firestore catalog · fix cart · agent write access · Codemagic/Apple secrets for mobile
- **NEXT ACTION:** Grant this Cloud Agent write access to `juda-food-app` OR open a Cursor agent on that repo; run catalog seed (`scripts/seed-fuse-catalog.mjs`) with Firebase admin credentials

⸻

### PROJECT: JEEL TECH Website
- **REPO:** `juda2018-del/jeel-tech-website`
- **BRANCH:** `main`
- **LAST COMMIT:** `e7f5630`
- **STATUS:** LIVE marketing site
- **BUILD:** static N/A
- **DEPLOYMENT:** https://jeel-tech-website.vercel.app
- **PRODUCTION URL:** https://jeel-tech-website.vercel.app
- **READINESS:** **95%**
- **CRITICAL BUGS:** none
- **FIXED:** none (push 403)
- **REMAINING:** favicon; optional polish
- **NEXT ACTION:** Low priority — add favicon when write access available

⸻

### PROJECT: SUQLY AI
- **REPO:** `juda2018-del/suqly-ai` (requested)
- **BRANCH / COMMIT:** unknown
- **STATUS:** **BLOCKED** — GitHub 404 to this token; product LIVE at https://www.suqly.cloud
- **BUILD / DEPLOYMENT:** unknown from GH
- **PRODUCTION URL:** https://www.suqly.cloud (also suqly.ai)
- **READINESS:** unknown (needs repo access)
- **NEXT ACTION:** Make repo visible to Cursor Cloud Agent (invite collaborator / connect private repo)

⸻

### PROJECT: Fancy Hub
- **REPO:** `juda2018-del/fancy-hub-app` (requested)
- **STATUS:** **BLOCKED** — GitHub 404; live https://fancy-hub.vercel.app («The Fancy House»)
- **NEXT ACTION:** Connect private repo or confirm correct repository name

⸻

### PROJECT: JARDAK AI / JODA OS
- **STATUS:** **BLOCKED** — no public GH repo, no confirmed production URL from this scan
- **NEXT ACTION:** Provide correct repo names/URLs or grant private access

---

## RECOMMENDED WORK ORDER

1. **Unblock access** — Invite Cloud Agent / connect private repos: `suqly-ai`, `fancy-hub-app`, `jarda`/`jardak`, `joda-os`; grant **push** on `juda-food-app` and `jeel-tech-website`.
2. **P0 FUSE** — Fix Firestore catalog linkage so add-to-cart works; re-run browser order flow; then deploy.
3. **P1 JAZAL secrets** — Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `OPENAI_API_KEY`; merge admin-gate PR; production redeploy; enable GitHub Pages in repo Settings.
4. **P1 SUQLY + Fancy Hub** — Full audit once GH access exists (same checklist as JAZAL/FUSE).
5. **P2 JEEL** — Favicon + light QA.
6. **P3** — Locate JARDAK / JODA OS sources.

---

## Permissions you must grant (explicit)

| Secret / permission | Needed for |
|---------------------|------------|
| GitHub: agent write on FUSE + JEEL + private repos | Ship fixes outside `juda2018-del/-` |
| `VERCEL_TOKEN` + `VERCEL_ORG_ID` (+ project id) | Deploy JAZAL from agent |
| `OPENAI_API_KEY` on Vercel JAZAL | Real TTS Audio Studio |
| Firebase service account / CLI | Hosting deploy + admin claims + FUSE seed |
| Codemagic / Apple / Google Play | Mobile store builds |
| GitHub Pages enable on `juda2018-del/-` | https://juda2018-del.github.io/-/ |

---

## Evidence index

- Inventory commands: `gh repo list juda2018-del`, direct `gh api repos/...`
- JAZAL build: `npm run launch` exit 0
- JAZAL verify: `npm run deploy:verify` → jazal.vercel.app OK
- FUSE build: `/tmp/juda-food-app` next build + lint + tsc exit 0
- Browser QA: `/opt/cursor/artifacts/QA-REPORT.md` + screenshots
- HTTP probes: jazal / fuse / jeel / suqly / fancy-hub status codes recorded in agent session
