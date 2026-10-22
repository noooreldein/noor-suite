interface Props { page: number; pages: number; onPage: (p: number) => void }

export function Pagination({ page, pages, onPage }: Props) {
  if (pages <= 1) return null;
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ السابق</button>
      <span className="mono" style={{ color: 'var(--soft)', fontSize: 12 }}>{page} / {pages}</span>
      <button className="btn btn-sm btn-outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي ›</button>
    </div>
  );
}
