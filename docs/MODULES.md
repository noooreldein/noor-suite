# دليل الموديولات

| الموديول | المسار | يعتمد على |
|---|---|---|
| Dashboard | modules/dashboard | products, invoices, tasks |
| POS | modules/pos | products, partners, invoices |
| Sales/Purchases | modules/sales | invoices, partners, products, ledger |
| Inventory | modules/inventory | products, notifications |
| Partners | modules/partners | partners |
| CRM | modules/crm | leads |
| HR | modules/hr | employees, attendance |
| Projects | modules/projects | tasks, employees |
| Accounting | modules/accounting | ledger |
| Reports | modules/reports | كل الكيانات |
| Calendar | modules/calendar | invoices, tasks |
| Settings | modules/settings | settings (نسخ احتياطي) |
| Notifications | modules/notifications | notifications |

## قواعد العمل

- **الفاتورة**: تاريخ + جهة + أصناف. البيع يخصم المخزون، الشراء يضيفه.
- **القيود المحاسبية**: تُنشأ تلقائياً مع كل فاتورة في حساب sales/purchases.
- **التنبيهات**: أي منتج يصل لحد إعادة الطلب يولّد تنبيهاً.
- **CRM**: الفرصة تتحرك بين 5 مراحل بالأزرار (سحب منطقي مبسط).
