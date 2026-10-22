export function StatCard({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'primary' | 'green' | 'red' | 'amber' | 'blue' }) {
  const color = tone ? `var(--${tone})` : 'var(--ink)';
  return (
    <div className="kpi">
      <div className="k-label">{label}</div>
      <div className="k-num" style={{ color }}>{value}</div>
      {sub && <div className="k-sub">{sub}</div>}
    </div>
  );
}
