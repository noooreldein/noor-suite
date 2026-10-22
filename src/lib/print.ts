/** Print an HTML document in a new window (invoices, receipts, reports). */
export function printHTML(title: string, bodyHTML: string, styles = ''): void {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${title}</title>
    <style>
      body{font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;padding:36px;color:#111;max-width:720px;margin:0 auto}
      table{width:100%;border-collapse:collapse;margin-top:18px}
      th,td{padding:8px 12px;text-align:right;border-bottom:1px solid #ddd;font-size:13px}
      th{background:#f1f5f9}
      h1{color:#4f46e5;margin-bottom:2px;font-size:22px}
      .muted{color:#777;font-size:12px}
      .tot{display:flex;justify-content:space-between;margin-top:16px;font-weight:700;font-size:16px}
      ${styles}
    </style></head><body>${bodyHTML}<script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}
