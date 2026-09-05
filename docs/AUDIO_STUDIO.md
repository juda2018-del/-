# Admin Audio Studio (publisher-only)

## Purpose
Convert written episode scripts into a **final downloadable MP3** for review.
Generation is **not** publish. Public listeners never see TTS controls.

## Workflow
1. Admin signs in (Firebase Auth + `admin` custom claim)
2. Open Admin → **استوديو الصوت**
3. Select Story + Episode (default: internal `studio-test`), edit script / voices / optional music+SFX
4. **Generate Audio** → server TTS → merge → final `.mp3` (**draft only**)
5. Play / Download MP3
6. **Save draft to Storage** (optional) or **Attach to episode**
7. Publish story with existing admin controls (separate step — Generate never publishes)

## Internal test episode
- Story id: `studio-test` (adminOnly, `published:false`)
- Episode id: `studio-test-1` with short Arabic multi-role script
- Hidden from public library until an admin explicitly publishes it

## API
- `GET /api/audio-health` — provider readiness (no secrets)
- `POST /api/audio-generate` — admin Bearer token required; returns `audio/mpeg`
- Compatibility aliases: `/api/audio-studio/health`, `/api/audio-studio/generate`

## Secrets (Vercel → Project Settings → Environment Variables → Production)
- `OPENAI_API_KEY` (**required** for real generation)
- `GOOGLE_TTS_API_KEY` (optional fallback)
- `TTS_PROVIDER` optional `openai` | `google`
- `OPENAI_TTS_MODEL` optional (default `tts-1-hd`)
- `FIREBASE_PROJECT_ID` optional (default `jazal-audio`)

Never put these in frontend code, client bundles, or chat. After adding `OPENAI_API_KEY`, redeploy Production and confirm `/api/audio-health` shows `ttsConfigured: true`.

## Script format
```
[راوي]
كان الليل هادئاً...
[أحمد]
أين نحن؟
[سارة]
لا أعرف...
```

## Security
- Public users cannot open Audio Studio UI (admin claim required)
- `/api/audio-generate` rejects missing/non-admin tokens (401/403)
- Storage: `audio/` public read; `audio-studio/` + `audio-private/` admin-only read/write
