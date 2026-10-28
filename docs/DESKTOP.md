# تشغيل Noor Suite كتطبيق سطح مكتب (Tauri)

نسخة سطح المكتب هي نفس التطبيق الويب ملفوفاً في **Tauri 2**: نافذة أصلية، أيقونة، مثبت،
وبدون متصفح ظاهر — مع نفس قاعدة الكود وقاعدة بيانات Supabase نفسها.

## المتطلبات (مرة واحدة لكل جهاز تطوير)

| النظام | المطلوب |
|---|---|
| Windows | [Rust](https://rustup.rs) + **Microsoft C++ Build Tools** (مثبت مع Visual Studio Build Tools) + WebView2 (موجود افتراضياً في Windows 10/11) |
| macOS | Xcode Command Line Tools + Rust |
| Linux | Rust + `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf` |

```bash
npm install            # مرة واحدة
```

## التطوير

```bash
npm run desktop:dev    # يفتح نافذة سطح المكتب مع إعادة تحميل حية
```

## بناء المثبت

```bash
npm run desktop:build
```

النواتج في `src-tauri/target/release/bundle/`:

| النظام | الملف |
|---|---|
| Windows | `msi/Noor Suite_3.2.0_x64_en-US.msi` و `nsis/Noor Suite_3.2.0_x64-setup.exe` |
| macOS | `dmg/Noor Suite_3.2.0_x64.dmg` (وللـ Apple Silicon: `aarch64`) |
| Linux | `deb/noor-suite_3.2.0_amd64.deb` و `appimage/Noor Suite_3.2.0_amd64.AppImage` |

### بدون جهاز Windows؟
شغّل من GitHub: **Actions → Desktop Build → Run workflow** — يبني مثبتات ويندوز ولينكس
ويرفعها كـ Artifacts. (أو اعمل tag يبدأ بـ `v`.)

## ملاحظات سلوكية

- **البيانات**: وضع الزائر يخزن في `localStorage` داخل نافذة التطبيق (مجلد بيانات المستخدم)،
  والحساب السحابي يزامن مع Supabase. مسح بيانات النافذة = مسح البيانات المحلية، لذلك استخدم
  النسخ الاحتياطية قبل أي تنظيف.
- **الروابط الخارجية** (واتساب، GitHub) تُفتح في المتصفح النظامي وليس داخل التطبيق.
- **الطباعة** (فاتورة A4، تقرير وردية): `window.print()` يفتح حوار الطباعة في WebView2 (ويندوز)
  و WebKitGTK الحديث على لينكس.
- **الأوفلاين**: كل الشاشات والعمليات تعمل محلياً؛ المزامنة تحتاج إنترنت فقط للحساب السحابي.
- **التوقيع**: مثبتات غير موقعة قد تظهر تحذير SmartScreen — للحصول على تثبيت سلس لاحقاً:
  شهادة توقيع كود (Windows) و Notarization (macOS).
- **التحديثات**: حالياً إعادة تثبيت. يمكن إضافة `tauri-plugin-updater` لاحقاً مع مزود تحديث.

## التحقق الآلي في CI
كل دفع يشغّل اختبارات الوحدة والبناء الويب. ملف `.github/workflows/desktop.yml` يبني المثبتات
عند الطلب أو عند وسم إصدار.
