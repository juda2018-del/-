# JAZAL / جَزَل

بودكاست وقصص صوتية — Web + iOS + Android

- **Web:** https://jazal.vercel.app
- **Firebase:** `jazal-audio`
- **Bundle ID:** `iq.jeeltech.jazal`

## التشغيل

```bash
npm install
npm run dev
```

## فحوصات الإنتاج

```bash
npm run build
npm run lint
npm run typecheck
npm run cap:sync
```

## Firebase

1. فعّل Email/Password في Authentication
2. أنشئ حساب الأدمن من Firebase Console (Authentication → Users)
3. فعّل Custom Claim للأدمن:

```bash
npm install firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
node firebase/set-admin-claim.js admin@yourdomain.com
```

4. انشر Rules:

```bash
firebase deploy --only firestore:rules,storage --project jazal-audio
```

أو انسخ يدوياً:
- `firebase/firestore.rules` → Firestore Rules
- `firebase/storage.rules` → Storage Rules

5. من **استوديو الإدارة → Firebase** سجّل دخول الأدمن وارفع المحتوى الحقيقي (MP3)

## Capacitor (iOS / Android)

```bash
npm install
npm run cap:sync
npm run cap:open:ios      # يحتاج Mac + Xcode
npm run cap:open:android  # Android Studio → Signed AAB
```

## النشر

راجع `docs/DEPLOY.md` للتفاصيل الكاملة.

- **معاينة فورية (ثيم Aurora):** شغّل `npm run deploy:preview` أو افتح آخر رابط `temporary-*.vercel.app`
- **Web (Vercel):** https://jazal.vercel.app — اربط `main` بمشروع **JAZAL** على فريق **juda12**
- **Web (GitHub Pages):** https://juda2018-del.github.io/-/ — يُنشر تلقائياً من `main`
- **Web (Firebase Hosting):** `npm run firebase:deploy:hosting` → `https://jazal-audio.web.app`
- **iOS:** Xcode → Archive → App Store Connect (`iq.jeeltech.jazal`)
- **Android:** Generate Signed Bundle → Google Play

## الصفحات

Home · Library · Story Details · Player · FM · Submit · Account · Admin · Privacy · Terms · Support · About · Plans

## الأمان

- قراءة المحتوى عامة
- الكتابة على Firestore/Storage للأدمن فقط (`custom claim: admin=true`)
- لا يوجد تسجيل أدمن من التطبيق — الحسابات تُنشأ من Firebase Console
- `assets/jazal-demo.mp3` للاختبار فقط — ارفع MP3 حقيقي من الإدارة
