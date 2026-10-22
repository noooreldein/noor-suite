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
import { fmtDate } from '../../lib/dates';
import { shortId } from '../../lib/id';
import { download, toCSV } from '../../lib/csv';
import { printHTML } from '../../lib/print';
import { InvoiceFormModal } from './InvoiceFormModal';

export function SalesPage({ kind }: { kind: 'sale' | 'purchase' }) {
  const { data, toast } = useStore();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  const all = useMemo(() => data.invoices.filter(i => i.kind === kind), [data.invoices, kind]);
  const rows = useMemo(() => all.filter(i =>
    (tab === 'all' || i.status === tab) &&
    (q === '' || partnerName(data, i.partnerId).includes(q) || i.id.includes(q))
  ), [all, tab, q, data]);

  const sum = all.reduce((s, i) => s + i.total, 0);
  const unpaid = all.filter(i => i.status === 'unpaid');

  const doPrint = (id: string) => {
    const inv = data.invoices.find(i => i.id === id)!;
    printHTML('فاتورة', `
      <h1>${data.settings.companyName}</h1>
      <div class="muted">${kind === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'} #${shortId(inv.id)} — ${fmtDate(inv.date)}</div>
      <div class="muted">الجهة: <b>${partnerName(data, inv.partnerId)}</b></div>
      <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${inv.items.map((it: any) => `<tr><td>${it.name}</td><td>${it.qty}</td><td>${num(it.price)}</td><td>${num(it.qty * it.price)}</td></tr>`).join('')}</tbody></table>
      <div class="tot"><span>الإجمالي</span><span>${num(inv.total)} ج.م</span></div>`);
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
            <Badge key="s" tone={i.status === 'paid' ? 'green' : 'red'}>{i.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}</Badge>,
            <div key="a" className="row">
              <Button size="sm" variant="outline" onClick={() => doPrint(i.id)}>طباعة</Button>
            </div>,
          ]} />
      </div>
      {creating && <InvoiceFormModal kind={kind} onClose={() => setCreating(false)} />}
    </>
  );
}

export function partnerName(data: any, id: string): string {
  return data.partners.find((p: any) => p.id === id)?.name ?? '—';
}
