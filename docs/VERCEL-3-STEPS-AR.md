# آخر 3 خطوات من الموبايل (بعد Claim)

المشروع الجديد **temporary-sonic-harp** يشغّل ثيم **Fusion v3** ✅  
الرابط المباشر: https://temporary-sonic-harp-0ymnpou.vercel.app

## 1) Connect Git
من لوحة المشروع → **Connect Git**
- المستودع: `juda2018-del/-`
- الفرع: `main`
- Build: `npm run build`
- Output: `www`

## 2) ربط الدومين
**Settings → Domains → Add**
- اكتب: `jazal.vercel.app`
- إذا قال محجوز: ادخل المشروع القديم **JAZAL** واحذف الدومين منه، ثم أضفه هنا.

## 3) (اختياري) تسمية المشروع
**Settings → General → Project Name** → `jazal`

## تحقق
```bash
curl -s https://jazal.vercel.app/app.js | rg jazal-fusion-v3
```

أو أرسل **"تحقق"** للوكيل.
