/** Settings — company info, backup & restore, about. */
import { useRef, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { download } from '../../lib/csv';

export function SettingsPage() {
  const { data, settings, setSettings, exportAll, importAll, reseed, toast } = useStore();
  const [tab, setTab] = useState('company');
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(settings);

  const counts = [
    ['المنتجات', data.products.length], ['الجهات', data.partners.length],
    ['الفواتير', data.invoices.length], ['الفرص', data.leads.length],
    ['الموظفين', data.employees.length], ['المهام', data.tasks.length],
    ['قيود اليومية', data.ledger.length],
  ];

  return (
    <>
      <div className="toolbar">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'company', label: 'بيانات الشركة' },
          { key: 'backup', label: 'نسخ احتياطي' },
          { key: 'about', label: 'عن النظام' },
        ]} />
      </div>

      {tab === 'company' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-body">
            <label className="field">اسم الشركة</label>
            <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
            <div className="form-grid">
              <div>
                <label className="field">العملة</label>
                <input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
              </div>
              <div>
                <label className="field">نسبة الضريبة %</label>
                <input type="number" value={form.vatRate} onChange={e => setForm({ ...form, vatRate: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="field">اللغة</label>
                <select value={form.lang} onChange={e => setForm({ ...form, lang: e.target.value as any })}>
                  <option value="ar">العربية</option><option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="field">السمة</label>
                <select value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value as any })}>
                  <option value="light">فاتحة</option><option value="dark">ليلية</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <Button onClick={() => { setSettings(form); toast('تم حفظ الإعدادات ✓'); }}>حفظ الإعدادات</Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-body">
            <p style={{ color: 'var(--soft)', marginBottom: 14 }}>
              البيانات محفوظة محلياً في المتصفح. صدّر نسخة JSON للاحتياط أو لنقل البيانات.
            </p>
            <div className="row">
              <Button onClick={() => { download(`noor-suite-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAll(), 'application/json'); toast('تم تصدير النسخة ✓'); }}>⬇ تصدير</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>⬆ استيراد</Button>
              <Button variant="danger" onClick={() => { reseed(); toast('تمت إعادة الضبط للبيانات التجريبية'); }}>إعادة ضبط</Button>
            </div>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = ev => {
                if (importAll(String(ev.target?.result))) toast('تم استيراد البيانات ✓');
                else toast('الملف غير صالح', 'err');
              };
              reader.readAsText(f);
            }} />
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16 }}>نور سويت v1.0.0</h3>
            <p style={{ color: 'var(--soft)', margin: '6px 0 16px' }}>نظام إدارة أعمال متكامل مبني بـ React + TypeScript بدون أي مكتبات إضافية.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {counts.map(([label, count]) => (
                <div key={label as string} className="row" style={{ justifyContent: 'space-between', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, fontSize: 12.5 }}>
                  <span>{label}</span><b>{count as number}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
