/** Settings — company info, backup & restore, about. */
import { useEffect, useRef, useState } from 'react';
import { sha256 } from '../../lib/hash';
import * as backend from '../../lib/backend';
import { Badge } from '../../components/ui/Badge';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { download } from '../../lib/csv';
import { readSyncLog, clearSyncLog, logSync } from '../../lib/sync';
import * as db from '../../lib/db';

function CloudStatus() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { backend.getUser().then(u => setEmail(u?.email ?? null)); }, []);
  if (!email) return <span style={{ fontSize: 12.5, color: 'var(--soft)' }}>بيانات محلية على الجهاز فقط — سجّل الدخول من شاشة البداية للمزامنة السحابية</span>;
  return (
    <>
      <Badge tone="green">متصل: {email}</Badge>
      <Button variant="outline" onClick={() => { backend.signOut().then(() => location.reload()); }}>تسجيل خروج</Button>
    </>
  );
}

export function SettingsPage() {
  const { data, settings, setSettings, exportAll, importAll, reseed, toast, enterLocal } = useStore();
  const [pw, setPw] = useState('');
  const savePw = async () => {
    if (pw.trim().length < 4) return toast('كلمة المرور 4 أحرف على الأقل');
    setSettings({ passwordHash: await sha256(pw.trim()) } as any);
    setPw('');
    toast('تم تعيين كلمة المرور');
  };
  const clearPw = () => { setSettings({ passwordHash: undefined } as any); toast('تم إلغاء قفل النظام'); };
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
              <CloudBackups />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>⬆ استيراد</Button>
              <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head"><h3>الحساب السحابي</h3></div>
              <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <CloudStatus />
              </div>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-head"><h3>قفل النظام</h3></div>
              <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {settings?.passwordHash ? (
                  <>
                    <Badge tone="green">مقفلة بكلمة مرور</Badge>
                    <Button variant="outline" onClick={clearPw}>إلغاء القفل</Button>
                  </>
                ) : <span style={{ fontSize: 12.5, color: 'var(--soft)' }}>النظام مفتوح — عيّن كلمة مرور لطلبها عند كل تشغيل</span>}
                <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة مرور جديدة" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }} />
                <Button onClick={savePw}>{settings?.passwordHash ? 'تغيير' : 'تعيين'}</Button>
              </div>
            </div>
            <Button variant="danger" onClick={() => { if (confirm('استعادة بيانات تجريبية؟ سيتم استبدال البيانات الحالية — صدّر نسخة أولاً إن أردت الاحتفاظ بها.')) { reseed(); toast('تم تحميل بيانات تجريبية'); } }}>استعادة بيانات تجريبية</Button>
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
            <h3 style={{ fontSize: 16 }}>نور سويت v2.6.0</h3>
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


/** Cloud backups — automatic daily snapshots + manual create/restore/delete. */
function CloudBackups() {
  const { exportAll, ingest, toast } = useStore();
  const [items, setItems] = useState<backend.BackupMeta[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => backend.listBackups().then(setItems).catch(() => {});
  useEffect(() => { backend.getUser().then(u => setEmail(u?.email ?? null)).then(reload); }, []);

  if (!email) return null;

  const create = async () => {
    setBusy(true);
    const ok = await backend.createBackup(exportAll());
    setBusy(false);
    toast(ok ? 'اتعملت نسخة سحابية ✓' : 'تعذّر عمل النسخة', ok ? 'ok' : 'err');
    logSync({ at: new Date().toISOString(), kind: 'backup', msg: 'نسخة سحابية يدوية' });
    reload();
  };

  const restore = async (id: string) => {
    if (!confirm('استعادة هذه النسخة؟ سيتم استبدال البيانات الحالية بمحتواها.')) return;
    setBusy(true);
    const bk = await backend.fetchBackup(id);
    setBusy(false);
    if (!bk?.data) return toast('تعذّر جلب النسخة', 'err');
    try {
      const parsed = db.normalize(typeof bk.data === 'string' ? JSON.parse(bk.data) : bk.data);
      ingest(parsed);
      await backend.migrateLocal(parsed); // re-push everything to the cloud
      logSync({ at: new Date().toISOString(), kind: 'restore', msg: `استعادة نسخة ${id.slice(3, 12)}` });
      toast('تمت الاستعادة ✓ — هيتجدد التطبيق');
      setTimeout(() => location.reload(), 900);
    } catch { toast('النسخة غير صالحة', 'err'); }
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head"><h3>النسخ الاحتياطية السحابية</h3></div>
      <div className="card-body">
        <p style={{ fontSize: 12.5, color: 'var(--soft)' }}>تُنشأ نسخة تلقائية كل 24 ساعة عند فتح النظام من أي جهاز — ويتم الاحتفاظ بآخر 7 نسخ.</p>
        <div className="row" style={{ marginBottom: 10 }}>
          <Button disabled={busy} onClick={create}>+ نسخة الآن</Button>
        </div>
        {!items.length && <p style={{ fontSize: 12.5, color: 'var(--soft)' }}>لا توجد نسخ بعد.</p>}
        {items.map(b => (
          <div key={b.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 13 }}>{new Date(b.created_at).toLocaleString('ar-EG')} · {(b.size / 1024).toFixed(1)} KB</span>
            <span className="row">
              <Button variant="outline" disabled={busy} onClick={() => restore(b.id)}>استعادة</Button>
              <Button variant="outline" disabled={busy} onClick={() => { backend.fetchBackup(b.id).then(r => { if (r?.data) download(`noor-cloud-${b.id}.json`, JSON.stringify(r.data, null, 2), 'application/json'); }); }}>تحميل</Button>
              <Button variant="danger" disabled={busy} onClick={() => { if (confirm('حذف النسخة؟')) { backend.deleteBackup(b.id).then(reload); } }}>حذف</Button>
            </span>
          </div>
        ))}
        <SyncLogCard />
      </div>
    </div>
  );
}

/** Sync log — conflicts & backup history, per device. */
function SyncLogCard() {
  const [entries, setEntries] = useState(readSyncLog());
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head"><h3>سجل المزامنة</h3></div>
      <div className="card-body">
        {!entries.length && <p style={{ fontSize: 12.5, color: 'var(--soft)' }}>لا توجد تعارضات أو أحداث مزامنة على هذا الجهاز.</p>}
        {entries.slice(0, 12).map((e, i) => (
          <div key={i} className="row" style={{ gap: 8, padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: 12.5 }}>
            <Badge tone={e.kind === 'conflict' ? 'amber' : e.kind === 'restore' ? 'blue' : 'green'}>
              {e.kind === 'conflict' ? 'تعارض' : e.kind === 'restore' ? 'استعادة' : e.kind === 'backup' ? 'نسخة' : 'معلومة'}
            </Badge>
            <span style={{ flex: 1 }}>{e.msg}</span>
            <span style={{ color: 'var(--soft)', fontSize: 11 }}>{new Date(e.at).toLocaleTimeString('ar-EG')}</span>
          </div>
        ))}
        {!!entries.length && <Button variant="outline" onClick={() => { clearSyncLog(); setEntries([]); }}>تفريغ السجل</Button>}
      </div>
    </div>
  );
}
