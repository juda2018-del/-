# MASTER INVENTORY — juda2018-del GitHub

**Generated:** 2026-09-04  
**GitHub account scanned:** `juda2018-del` (`public_repos: 3`)  
**Scanner identity:** `cursor[bot]` (Cloud Agent token)  
**Owning user (Cursor):** مصطفى جودة / juda2018@gmail.com

---

## Access boundary (evidence)

```text
gh repo list juda2018-del  → 3 public repos only
gh api user/repos          → 403 Resource not accessible by integration
Private priority repos     → HTTP 404 (not visible to this token)
Push to juda-food-app      → 403 denied to cursor[bot]
Push to jeel-tech-website  → 403 denied to cursor[bot]
Push to juda2018-del/-     → OK (this workspace)
```

---

## A) Repositories visible & writable / readable

| # | Repo | Visibility | Default | Last commit (SHA) | Last push | Stack | Prod URL | Class | Priority |
|---|------|------------|---------|-------------------|-----------|-------|----------|-------|----------|
| 1 | `juda2018-del/-` | public | main | `7e2e730` (pre-audit main) | 2026-09-04 | JS SPA + Capacitor + Firebase + Vercel API | https://jazal.vercel.app | PRODUCTION APP / MOBILE | **P1** |
| 2 | `juda2018-del/juda-food-app` | public | main | `3b60260` | 2026-08-30 | Next.js 16 + React 19 + Firebase + Capacitor 8 + Codemagic | https://juda-food-app.vercel.app · https://www.fuseiraq.com | PRODUCTION APP / MOBILE / SAAS-ops | **P0** |
| 3 | `juda2018-del/jeel-tech-website` | public | main | `e7f5630` | 2026-07-17 | Static HTML/CSS/JS | https://jeel-tech-website.vercel.app | WEB APP | **P2** |

---

## B) Priority projects requested but NOT in GitHub access

| Requested | Live evidence (HTTP) | GitHub | Status |
|-----------|----------------------|--------|--------|
| `juda2018-del/juda-food-app` (FUSE) | 200 juda-food-app.vercel.app / fuseiraq.com | ✅ public (read-only to agent) | Audited; **write BLOCKED** |
| `juda2018-del/suqly-ai` (SUQLY AI) | 200 https://www.suqly.cloud · suqly.ai | ❌ 404 / not listed | **BLOCKED** — private or different owner/name |
| `juda2018-del/fancy-hub-app` (Fancy Hub) | 200 https://fancy-hub.vercel.app (The Fancy House) | ❌ 404 / not listed | **BLOCKED** — no GH access |
| `juda2018-del/jazal` (JAZAL) | 200 https://jazal.vercel.app | Lives as repo **`juda2018-del/-`** | Audited + fixes |
| `juda2018-del/jarda` (JARDAK AI) | none found | ❌ 404 | **BLOCKED** |
| `juda2018-del/joda-os` (JODA OS) | none found | ❌ 404 | **BLOCKED** |

---

## C) Per-repo snapshot

### 1. JAZAL — `juda2018-del/-`
- **Working tree (agent):** clean on feature branch after fixes
- **README/package:** `jazal@1.2.0`
- **Framework:** Vanilla JS + Capacitor + Firebase + Vercel
- **Integrations:** Firebase `jazal-audio`, Vercel team `juda12`, OpenAI TTS (server)
- **Build:** PASS (`npm run launch`)
- **Deploy:** Vercel LIVE; Pages BLOCKED; Firebase Hosting 404

### 2. FUSE — `juda2018-del/juda-food-app`
- **Homepage field:** https://juda-food-app.vercel.app
- **Also:** https://fuse-iraq.vercel.app · https://www.fuseiraq.com
- **Framework:** Next.js static export + Capacitor (`com.fuseiraq.app`) + Codemagic iOS
- **Build (cloned):** `npm ci` ✅ · `npm run build` ✅ · `eslint` ✅ · `tsc --noEmit` ✅
- **Browser QA:** cart/order blocked — products not linked to Firestore catalog
- **Agent write:** **BLOCKED** (403)

### 3. JEEL TECH — `juda2018-del/jeel-tech-website`
- **Framework:** static marketing site
- **Build:** N/A (static)
- **Browser QA:** sections + WhatsApp CTA OK; missing favicon
- **Agent write:** **BLOCKED** (403)

---

## D) Classification summary

| Class | Repos |
|-------|-------|
| PRODUCTION APP | JAZAL (`-`), FUSE (`juda-food-app`) |
| SAAS | SUQLY (live, GH BLOCKED) |
| MOBILE APP | JAZAL, FUSE (Capacitor) |
| WEB APP | JEEL TECH |
| BACKEND/API | JAZAL `api/audio-*` (part of `-`) |
| EXPERIMENT | (none confirmed in accessible GH) |
| ARCHIVED/UNFINISHED | (none) |
| BROKEN/BLOCKED | GitHub Pages/Firebase Hosting (JAZAL); FUSE cart DB; private priority repos |

---

## E) Priority queue

| Pri | Item | Why |
|-----|------|-----|
| **P0** | FUSE cart/catalog Firestore | Production ordering broken in browser |
| **P0** | Grant agent write on FUSE / private repos | Cannot ship fixes |
| **P1** | JAZAL secrets + TTS + Pages enable | Near-complete product |
| **P1** | SUQLY / Fancy Hub GH access | Live products, no repo visibility |
| **P2** | JEEL favicon + polish | Marketing site mostly ready |
| **P3** | JARDAK / JODA OS discovery | No live/GH evidence yet |
