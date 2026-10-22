/** Domain events — emitted for the notification center & future integrations. */
import { InvoiceKind } from './entities';

export type DomainEvent =
  | { type: 'invoice.created'; kind: InvoiceKind; total: number }
  | { type: 'stock.low'; product: string; stock: number }
  | { type: 'task.overdue'; task: string }
  | { type: 'lead.won'; lead: string; value: number }
  | { type: 'backup.exported' }
  | { type: 'backup.imported'; records: number };

export type EventListener = (e: DomainEvent) => void;

export function describeEvent(e: DomainEvent): string {
  switch (e.type) {
    case 'invoice.created': return `فاتورة ${e.kind === 'sale' ? 'مبيعات' : 'مشتريات'} بمبلغ ${e.total}`;
    case 'stock.low': return `المخزون منخفض: ${e.product} (${e.stock})`;
    case 'task.overdue': return `مهمة متأخرة: ${e.task}`;
    case 'lead.won': return `فرصة مغلومة: ${e.lead} (${e.value} ج.م)`;
    case 'backup.exported': return 'تم تصدير نسخة احتياطية';
    case 'backup.imported': return `تم استيراد ${e.records} سجل`;
  }
}
