/** Client 360 — unified profile: purchases, outstanding, contact, WhatsApp follow-up. */
import { useStore } from '../../store/AppStore';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { num } from '../../lib/format';
import { Partner } from '../../types/entities';

const today = () => new Date().toISOString().slice(0, 10);

export function Client360Modal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useStore();
  const p = data.partners.find(x => x.id === id) as Partner | undefined;
  if (!p) return null;

  const sales = data.invoices.filter(i => i.partnerId === id && i.kind === 'sale')
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const purchases = data.invoices.filter(i => i.partnerId === id && i.kind === 'purchase');
  const unpaid = sales.filter(i => i.status === 'unpaid');
  const totalSales = sales.reduce((s, i) => s + i.total, 0);
  const outstanding = unpaid.reduce((s, i) => s + i.total, 0);
  const lastPurchase = sales[0]?.date;

  const wa = (text: string) =>
    `https://wa.me/${p!.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;

  return (
    <Modal title={`ملف ${p.type === 'customer' ? 'العميل' : 'المورد'}: ${p.name}`} onClose={onClose} width={720}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <Badge tone="blue">إجمالي المبيعات: {num(totalSales)}</Badge>
        <Badge tone={outstanding > 0 ? 'red' : 'green'}>مستحق: {num(outstanding)}</Badge>
        <Badge>{sales.length} فاتورة</Badge>
        {purchases.length > 0 && <Badge tone="amber">{purchases.length} فاتورة شراء</Badge>}
        {lastPurchase && <Badge>آخر شراء: {lastPurchase}</Badge>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, fontSize: 13 }}>
        <span className="mono">{p.phone}</span>
        {p.email && <span style={{ color: 'var(--soft)' }}>{p.email}</span>}
        {p.address && <span style={{ color: 'var(--soft)' }}>{p.address}</span>}
        <div className="grow" />
        <a className="btn btn-sm" target="_blank" rel="noreferrer"
          href={wa(p.type === 'customer'
            ? `مرحباً ${p.name}، معاك ${data.settings?.companyName ?? ''} — بنحب نتابع معاك، في حاجة تقدر نساعدك فيها؟`
            : `مرحباً ${p.name}، معاك ${data.settings?.companyName ?? ''} — بخصوص التوريدات، عندنا استفسار.`)}>
          متابعة واتساب
        </a>
        {outstanding > 0 && (
          <a className="btn btn-sm btn-outline" target="_blank" rel="noreferrer"
            href={wa(`مرحباً ${p.name}، نود تذكير مهذب بوجود فاتورة مستحقة بقيمة ${num(outstanding)} (${data.settings?.currency ?? ''}) بتاريخ ${unpaid[0].date}. شكراً لتعاونك!`)}>
            تذكير بمستحقات
          </a>
        )}
      </div>

      {p.notes && <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13 }}>{p.notes}</div>}

      <h4 style={{ margin: '0 0 8px' }}>تاريخ الفواتير</h4>
      <div className="card-body" style={{ maxHeight: 260, overflow: 'auto', padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>التاريخ</th><th>النوع</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
          <tbody>
            {[...sales, ...purchases].sort((a, b) => (a.date < b.date ? 1 : -1)).map(i => (
              <tr key={i.id}>
                <td className="mono">{i.date}</td>
                <td>{i.kind === 'sale' ? 'بيع' : 'شراء'}</td>
                <td><b>{num(i.total)}</b></td>
                <td><Badge tone={i.status === 'paid' ? 'green' : i.status === 'unpaid' ? 'red' : 'gray'}>
                  {i.status === 'paid' ? 'مدفوعة' : i.status === 'unpaid' ? 'غير مدفوعة' : 'جزئي'}</Badge></td>
              </tr>
            ))}
            {!sales.length && !purchases.length && <tr><td colSpan={4} style={{ color: 'var(--soft)' }}>لا فواتير بعد</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
