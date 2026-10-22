# النشر (GitHub Pages)

النشر تلقائي عبر GitHub Actions (`.github/workflows/deploy.yml`):

1. كل push على `main` يشغّل البناء
2. `npm ci` → `npm test` → `npm run build`
3. مجلد `dist` يُرفع إلى GitHub Pages

## نشر يدوي (GitHub CLI)
```bash
npm run build
npx gh-pages -d dist
```

## ملاحظات
- `base` في `vite.config.ts` مضبوط على `/noor-suite/`
- الراوتر hash-based فلا حاجة لإعادة توجيه 404
