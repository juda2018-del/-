# Admin Audio Studio (publisher-only)

## Purpose
Convert written episode scripts into a **final downloadable MP3** for review.
Generation is **not** publish. Public listeners never see TTS controls.

## Workflow
1. Admin signs in (Firebase Auth + `admin` custom claim)
2. Open Admin → **استوديو الصوت**
3. Select Story + Episode, edit script / voices / optional music+SFX
4. **Generate Audio** → server TTS → ffmpeg merge → final `.mp3`
5. Play / Download MP3
6. **Save draft to Storage** (optional) or **Attach to episode**
7. Publish story/episode with existing admin controls (separate step)

## API
- `GET /api/audio-health` — provider readiness (no secrets)
- `POST /api/audio-generate` — admin Bearer token required; returns `audio/mpeg`
- Compatibility aliases: `/api/audio-studio/health`, `/api/audio-studio/generate`

## Secrets (Vercel)
- `OPENAI_API_KEY` (required for real generation)
- `GOOGLE_TTS_API_KEY` (optional fallback)
- `TTS_PROVIDER` optional `openai` | `google`
- `OPENAI_TTS_MODEL` optional (default `tts-1-hd`)
- `FIREBASE_PROJECT_ID` optional (default `jazal-audio`)

## Script format
```
[راوي]
كان الليل هادئاً...
[أحمد]
أين نحن؟
[سارة]
لا أعرف...
```
