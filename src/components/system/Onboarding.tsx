/** First-run setup — choose a clean start or demo data. */
import { useState } from 'react';
import { useStore } from '../../store/AppStore';

export function Onboarding() {
  const { setSettings, reseed } = useStore();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('ج.م');
  const [vat, setVat] = useState(14);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [busy, setBusy] = useState(false);

  const finish = (demo: boolean) => {
    setBusy(true);
    if (demo) {
      reseed();
    } else {
      setSettings({ companyName: name.trim(), currency: currency.trim() || 'ج.م', vatRate: vat, lang, theme: 'light' } as any);
    }
    setBusy(false);
  };

  return (
    <div className="onboarding">
      <div className="onb-card">
        <div className="onb-badge">N</div>
        <h1 className="onb-title">{lang === 'ar' ? 'إعداد نظام إدارة الأعمال' : 'Business Suite Setup'}</h1>
        <p className="onb-sub">
          {lang === 'ar' ? 'خطوة واحدة وتبدأ إدارة مخزونك وفواتيرك وفريقك' : 'One step and you are ready to run your business'}
        </p>

        <div className="onb-form">
          <label>{lang === 'ar' ? 'اسم الشركة / المؤسسة' : 'Company name'}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'ar' ? 'مثال: مؤسسة النور التجارية' : 'e.g. Noor Trading'} />
          <div className="onb-row">
            <div>
              <label>{lang === 'ar' ? 'العملة' : 'Currency'}</label>
              <input value={currency} onChange={e => setCurrency(e.target.value)} />
            </div>
            <div>
              <label>{lang === 'ar' ? 'الضريبة %' : 'VAT %'}</label>
              <input type="number" value={vat} onChange={e => setVat(+e.target.value)} />
            </div>
          </div>
          <div className="onb-row">
            <div>
              <label>{lang === 'ar' ? 'اللغة' : 'Language'}</label>
              <select value={lang} onChange={e => setLang(e.target.value as any)}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        <button className="btn btn-primary onb-cta" disabled={busy || (!name.trim())} onClick={() => finish(false)}>
          {lang === 'ar' ? 'إنشاء النظام وابدأ الشغل' : 'Create and start'}
        </button>
        <button className="onb-demo" disabled={busy} onClick={() => { setSettings({ companyName: 'مؤسسة نور التجارية', currency: 'ج.م', vatRate: 14, lang, theme: 'light' } as any); reseed(); }}>
          {lang === 'ar' ? 'استكشاف سريع ببيانات تجريبية' : 'Explore with demo data'}
        </button>
        <p className="onb-note">{lang === 'ar' ? 'بياناتك تُخزن على جهازك — تصدير واستيراد كامل من الإعدادات' : 'Data stays on your device — full export/import from settings'}</p>
      </div>
    </div>
  );
}
