# معمارية النظام

## الطبقات

```
UI Components (components/)     ← عناصر عرض قابلة لإعادة الاستخدام
        ↓
Business Modules (modules/)     ← كل موديول صفحة/ميزة مستقلة
        ↓
Store (store/)                  ← حالة مركزية واحدة (React Context)
        ↓
Data Engine (lib/db.ts)         ← localStorage + normalize + import/export
```

## دورة البيانات

1. أي تعديل يمر عبر `AppStore.add/update/remove`
2. الـ store يحدّث الـ state ويكتب تلقائياً في `localStorage`
3. موديولات أخرى (المخازن، المحاسبة، لوحة التحكم) تقرأ نفس الـ state فتتحدث فوراً

## قرارات معمارية

- **بدون react-router**: راوتر hash يدوي (~60 سطراً) — أقل dependencies وأسرع تحميل
- **بدون مكتبة رسوم**: SVG يدوي يعطي تحكماً كاملاً في الـ RTL والألوان
- **TypeScript صارم**: كل كيان له نوع في `src/types/entities.ts`
- **قواعد محاسبية**: فاتورة البيع تخصم المخزون وتسجل قيد دائن؛ الشراء يضيف مخزون ويسجل مدين

## i18n

- `src/i18n/ar.ts` هو المصدر الحقيقي للمفاتيح، `en.ts` يتبعه بالأنواع
- تبديل اللغة يغير `document.documentElement.dir` فوراً (RTL/LTR)
