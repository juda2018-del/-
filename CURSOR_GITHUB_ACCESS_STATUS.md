# Cursor GitHub Access Status — Evidence

Date: 2026-09-05  
Agent: `cursor` (GitHub App installation token `ghs_*`)  
Environment repos: `["github.com/juda2018-del/-"]` only

## Installation repositories API

```
GET /installation/repositories
→ total_count: 1
→ repos: ["juda2018-del/-"]
```

## Per-repo access from this agent

| Repository | Exists (owner says) | Agent HTTP | Visibility to agent | Push |
|---|---|---|---|---|
| juda2018-del/- | yes | 200 | PUBLIC (only installed repo) | yes (this workspace) |
| juda2018-del/juda-food-app | yes | 200 | PUBLIC read; permissions.push=false | **403 denied to cursor[bot]** |
| juda2018-del/suqly-ai | yes | **404** | not in App install (private → 404) | no |
| juda2018-del/joda-os | yes | **404** | not in App install | no |
| juda2018-del/jardak-ai | yes | **404** | not in App install | no |
| juda2018-del/fancy-hub-app | yes | **404** | not in App install | no |
| juda2018-del/jazal-app | yes | **404** | not in App install | no |

Anonymous github.com/api for the five 404 names also return 404 → they are **private** (or renamed) and **not granted to the Cursor GitHub App**.

## Root cause (not “repo missing”)

**Cursor/GitHub App authorization is scoped to a single repository (`juda2018-del/-`).**  
Private repos outside that installation always appear as HTTP 404 to the agent token.  
Public `juda-food-app` is readable but **not writable** by `cursor[bot]`.

## Required owner action

1. GitHub → Settings → Applications → Installed GitHub Apps → **Cursor**
2. Repository access → **All repositories** OR add:
   - juda-food-app, suqly-ai, joda-os, jardak-ai, fancy-hub-app, jazal-app
3. Permissions: Contents R/W, Pull requests R/W
4. Cursor Dashboard → Cloud Agent Environment → add the same repos
5. Restart / re-run this Cloud Agent so a new installation token is issued

## Prepared but unpushed

FUSE cart fix commit local SHA `2bed8df` in `/tmp/fuse-audit` on branch `cursor/fuse-cart-fix-31e6`.  
Patch mirror: `patches/fuse-canonical-menu-and-ci.patch` in this JAZAL repo.
