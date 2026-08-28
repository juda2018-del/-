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
```

## Firebase

1. فعّل Email/Password في Authentication
2. انسخ `firebase/firestore.rules` إلى Firestore Rules
3. انسخ `firebase/storage.rules` إلى Storage Rules
4. من **استوديو الإدارة → Firebase** أنشئ حساب الأدمن وارفع المحتوى

## Capacitor (iOS / Android)

```bash
npm install
npx cap add ios
npx cap add android
npm run cap:sync
npm run cap:open:ios
npm run cap:open:android
```

## النشر

- **Web:** اربط المستودع بمشروع Vercel `JAZAL` أو `vercel deploy --prod`
- **iOS:** Xcode → Archive → App Store Connect
- **Android:** Android Studio → Generate Signed Bundle → Google Play

## الصفحات

Home · Library · Story Details · Player · FM · Submit · Account · Admin · Privacy · Terms · Support · About · Plans

## الأمان

- قراءة المحتوى عامة
- الكتابة على Firestore/Storage للأدمن فقط (`request.auth != null`)
- لوحة الإدارة محمية بتسجيل Firebase Auth
