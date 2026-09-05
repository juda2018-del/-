# كاهي فيروز — Motion Graphics Ad

إعلان Social عمودي أصلي لمطعم **كاهي فيروز** (زيونة، بغداد).

## الناتج

```bash
npm run video:render
```

ينتج:

- `kahi-fayrouz-ad/output/kahi-fayrouz-ad.mp4` — 1080×1920 · ~26s · 30fps
- `kahi-fayrouz-ad/preview/` — لقطات فحص
- `kahi-fayrouz-ad/storyboard/contact-sheet.jpg`

## Pipeline

1. `scripts/make_audio.py` — sound design مولّد + VO عراقي (`ar-IQ-BasselNeural`)
2. `scripts/render_frames.py` — إطارات سينمائية Canvas/PIL
3. `scripts/encode_video.py` — FFmpeg H.264/AAC
4. `scripts/make_preview.py` — ستيلز للـQC

## المفهوم

**«الصبح يبدأ من هنا»** — من ليل بغداد إلى كاهي بالقيمر.

راجع `RESEARCH.md` و `STORYBOARD.md`.

## ملاحظة أصول

الشعار داخل الفيديو **علامة مؤقتة أصلية** وليست الشعار الرسمي. لا يُعرض رقم هاتف أو إنستغرام غير مؤكد.
