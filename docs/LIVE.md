# جَزَل — جاهز للاستخدام

## الرابط المباشر (الإنتاج الحالي)

**https://jazal.vercel.app**

- إصدار مُتحقَّق: `jazal-audio-studio-v1` (`npm run deploy:verify`)
- يعمل على الموبايل والكمبيوتر
- يُضاف للشاشة الرئيسية كتطبيق (PWA)
- Audio Studio API: `/api/audio-health` → `ok:true` (TTS يحتاج `OPENAI_API_KEY` على Vercel)

## معاينات إضافية

| رابط | ملاحظة |
|------|--------|
| https://temporary-prompt-bugle-ugzt59v.vercel.app | معاينة Fusion / ثيم بديل |
| https://juda2018-del.github.io/-/ | GitHub Pages — **BLOCKED** حتى يفعّل المالك Pages من Settings |

## تحقق

```bash
npm run deploy:verify
curl -s https://jazal.vercel.app/api/audio-health
```

## ملاحظات نشر

- Firebase Hosting (`jazal-audio.web.app`) غير منشور حالياً (404).
- نشر Vercel جديد من هذا الـ agent يحتاج أسرار: `VERCEL_TOKEN` + `VERCEL_ORG_ID` (+ اختياري `VERCEL_PROJECT_ID`).
