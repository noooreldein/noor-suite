/** Sales & Purchases invoices list (shared, kind-driven). */
import { useMemo, useState } from 'react';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SearchBox } from '../../components/ui/SearchBox';
import { Table } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { StatCard } from '../../components/ui/StatCard';
import { num } from '../../lib/format';
import { shortId } from '../../lib/id';
import { download, toCSV } from '../../lib/csv';
import { printHTML } from '../../lib/print';
import { fmtDate } from '../../lib/dates';
import { InvoiceFormModal } from './InvoiceFormModal';
import { ReturnModal } from './ReturnModal';

export function SalesPage({ kind }: { kind: 'sale' | 'purchase' }) {
  const { data, update, toast } = useStore();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [retId, setRetId] = useState<string | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);

  const all = useMemo(() => data.invoices.filter(i => kind === 'sale' ? (i.kind === 'sale' || i.kind === 'return') : i.kind === kind), [data.invoices, kind]);
  const rows = useMemo(() => all.filter(i =>
    (tab === 'all' || i.status === tab) &&
    (q === '' || partnerName(data, i.partnerId).includes(q) || i.id.includes(q))
  ), [all, tab, q, data]);

  const sum = all.reduce((s, i) => s + i.total, 0);
  const unpaid = all.filter(i => i.status === 'unpaid');

  const doShare = (id: string) => {
    const inv = data.invoices.find(i => i.id === id)!;
    const st = data.settings;
    const p = data.partners.find(x => x.id === inv.partnerId);
    const sub = inv.items.reduce((s: number, it: any) => s + it.qty * it.price, 0);
    const vat = Math.round(sub * (st?.vatRate ?? 0)) / 100;
    const lines = [
      `*${st?.companyName ?? ''}*`,
      `${kind === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'} #${shortId(inv.id)} — ${fmtDate(inv.date)}`,
      `${kind === 'sale' ? 'العميل' : 'المورد'}: ${partnerName(data, inv.partnerId)}`,
      '',
      ...inv.items.map((it: any) => `- ${it.name} × ${it.qty} = ${num(it.qty * it.price)}`),
      '',
      `الإجمالي قبل الضريبة: ${num(sub)}`,
      `الضريبة (${st?.vatRate ?? 0}%): ${num(vat)}`,
      `*الإجمالي: ${num(sub + vat)} ${st?.currency ?? ''}*`,
      inv.status === 'unpaid' ? '\nالحالة: غير مدفوعة — برجاء السداد' : '\nالحالة: مدفوعة ✓',
    ].join('\n');
    const url = p?.phone
      ? `https://wa.me/2${String(p.phone).replace(/\D/g, '')}?text=${encodeURIComponent(lines)}`
      : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  const doPrint = (id: string) => {
    const inv = data.invoices.find(i => i.id === id)!;
    const st = data.settings;
    const sub = inv.items.reduce((s: number, it: any) => s + it.qty * it.price, 0);
    const vat = Math.round(sub * (st?.vatRate ?? 0)) / 100;
    printHTML('فاتورة', `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:14px">
        <div>
          <h1 style="margin:0">${st?.companyName ?? ''}</h1>
          <div class="muted">نظام إدارة الأعمال المتكامل</div>
        </div>
        <div style="text-align:left">
          <div style="font-size:20px;font-weight:800;color:#4f46e5">${kind === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}</div>
          <div class="mono muted" style="font-size:12px">#${shortId(inv.id)}</div>
          <div class="muted">${fmtDate(inv.date)}</div>
        </div>
      </div>
      <table style="margin-top:16px;border:none"><tr>
        <td style="border:none;padding:4px 0"><b>${kind === 'sale' ? 'العميل' : 'المورد'}:</b> ${partnerName(data, inv.partnerId)}</td>
        <td style="border:none;padding:4px 0;text-align:left"><b>الحالة:</b> <span style="color:${inv.status === 'paid' ? '#059669' : '#dc2626'};font-weight:700">${inv.status === 'paid' ? 'مدفوعة ✓' : 'غير مدفوعة'}</span></td>
      </tr></table>
      <table><thead><tr><th>م</th><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
      <tbody>${inv.items.map((it: any, i: number) => `<tr><td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td><td>${num(it.price)}</td><td>${num(it.qty * it.price)}</td></tr>`).join('')}</tbody></table>
      <div style="display:flex;justify-content:flex-end;margin-top:16px">
        <table style="width:280px;border:none">
          <tr><td style="border:none;padding:4px 0">الإجمالي قبل الضريبة</td><td style="border:none;padding:4px 0;text-align:left" class="mono">${num(sub)}</td></tr>
          <tr><td style="border:none;padding:4px 0">ضريبة (${st?.vatRate ?? 0}%)</td><td style="border:none;padding:4px 0;text-align:left" class="mono">${num(vat)}</td></tr>
          <tr style="font-weight:800;font-size:15px"><td style="border:none;border-top:2px solid #4f46e5;padding:8px 0;color:#4f46e5">الإجمالي المستحق</td><td style="border:none;border-top:2px solid #4f46e5;padding:8px 0;text-align:left" class="mono">${num(sub + vat)} ${st?.currency ?? ''}</td></tr>
        </table>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:48px">
        <div style="border-top:1px solid #999;padding-top:6px;width:180px;text-align:center;font-size:12px" class="muted">توقيع المستلم</div>
        <div style="border-top:1px solid #999;padding-top:6px;width:180px;text-align:center;font-size:12px" class="muted">الختم والاعتماد</div>
      </div>`, '');
    setPrinting(null);
  };

  return (
    <>
      <div className="kpis">
        <StatCard label={kind === 'sale' ? 'إجمالي المبيعات' : 'إجمالي المشتريات'} value={num(sum)} sub="جنيه" tone="primary" />
        <StatCard label="عدد الفواتير" value={all.length} />
        <StatCard label="غير مدفوعة" value={unpaid.length} tone={unpaid.length ? 'red' : 'green'} />
      </div>

      <div className="toolbar">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'all', label: `الكل (${all.length})` },
          { key: 'paid', label: `مدفوعة (${all.filter(i => i.status === 'paid').length})` },
          { key: 'unpaid', label: `غير مدفوعة (${unpaid.length})` },
        ]} />
        <SearchBox value={q} onChange={setQ} />
        <Button variant="outline" onClick={() => download(`${kind}s.csv`, toCSV(all.map((i: any) => ({ id: shortId(i.id), date: i.date, partner: partnerName(data, i.partnerId), total: i.total, status: i.status }))))}>CSV</Button>
        <Button onClick={() => setCreating(true)}>+ فاتورة</Button>
      </div>

      <div className="card">
        <Table cols={['الرقم', 'الجهة', 'التاريخ', 'الأصناف', 'الإجمالي', 'الحالة', '']} rows={rows}
          render={i => [
            <span key="id" className="mono">{shortId(i.id)}</span>,
            <b key="p">{partnerName(data, i.partnerId)}</b>,
            <span key="d" className="mono">{fmtDate(i.date)}</span>,
            <span key="c">{i.items.length}</span>,
            <b key="t" className="mono">{num(i.total)}</b>,
            <Badge key="s" tone={i.kind === 'return' ? 'amber' : i.status === 'paid' ? 'green' : i.status === 'partial' ? 'amber' : 'red'}>{i.kind === 'return' ? 'مرتجع' : i.status === 'paid' ? 'مدفوعة' : i.status === 'partial' ? 'جزئي' : 'غير مدفوعة'}</Badge>,
            <div key="a" className="row">
              {i.status === 'unpaid' && <Button size="sm" onClick={() => { update('invoices', i.id, { status: 'paid' }); toast('تم تحصيل الفاتورة'); }}>تحصيل</Button>}
              {kind === 'sale' && i.kind !== 'return' && <Button size="sm" variant="outline" onClick={() => setRetId(i.id)}>مرتجع</Button>}
              <Button size="sm" variant="outline" onClick={() => doPrint(i.id)}>طباعة</Button>
              <Button size="sm" variant="outline" title="مشاركة عبر واتساب" onClick={() => doShare(i.id)}>واتساب</Button>
            </div>,
          ]} />
      </div>
      {creating && <InvoiceFormModal kind={kind} onClose={() => setCreating(false)} />}
      {retId && <ReturnModal invoiceId={retId} onClose={() => setRetId(null)} />}
    </>
  );
}

export function partnerName(data: any, id: string): string {
  return data.partners.find((p: any) => p.id === id)?.name ?? '—';
}
