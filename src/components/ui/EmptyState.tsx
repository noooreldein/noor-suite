export function EmptyState({ msg = 'لا توجد بيانات بعد' }: { msg?: string }) {
  return <div className="empty">{msg}</div>;
}
