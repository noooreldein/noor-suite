/** Dependency-free SVG donut chart. */
interface Datum { label: string; value: number; color?: string }

const PALETTE = ['#4f46e5', '#16a34a', '#d97706', '#dc2626', '#2563eb', '#7c3aed', '#0891b2'];

export function DonutChart({ data, size = 160 }: { data: Datum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const R = 40, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="row" style={{ alignItems: 'center', gap: 20 }}>
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = `${frac * C} ${C}`;
          const el = (
            <circle key={d.label} cx="50" cy="50" r={R} fill="none"
              stroke={d.color ?? PALETTE[i % PALETTE.length]} strokeWidth="16"
              strokeDasharray={dash} strokeDashoffset={-offset}
              transform="rotate(-90 50 50)" />
          );
          offset += frac * C;
          return el;
        })}
        <text x="50" y="50" textAnchor="middle" dy="3" fontSize="10" fontWeight="700" fill="var(--ink)">{total.toLocaleString()}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={d.label} className="row" style={{ gap: 7, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color ?? PALETTE[i % PALETTE.length] }} />
            <span>{d.label}</span>
            <span className="mono" style={{ color: 'var(--soft)' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
