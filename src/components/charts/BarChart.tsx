/** Dependency-free bar chart — SVG bars + crisp HTML labels/values (no distorted canvas text). */
interface Datum { label: string; value: number }

export function BarChart({ data, height = 200, color = 'var(--primary)' }: { data: Datum[]; height?: number; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const H = height - 48;
  const W = 100 / data.length;
  const barH = (v: number) => (v / max) * (H - 18);
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
        {data.map((d, i) => {
          const h = barH(d.value);
          return <rect key={i} x={i * W + W * 0.2} y={H - h} width={W * 0.6} height={h} rx="1.5" fill={color} opacity="0.85" />;
        })}
      </svg>
      {/* values aligned to bar tops */}
      <div style={{ position: 'absolute', top: 0, insetInline: 0, height: H, pointerEvents: 'none', direction: 'ltr' }}>
        {data.map((d, i) => d.value > 0 && (
          <span key={i} style={{
            position: 'absolute', bottom: barH(d.value) + 3,
            left: `${(i + 0.5) * W}%`, transform: 'translateX(-50%)',
            fontSize: 10, fontWeight: 700, color: 'var(--ink)',
          }}>{d.value.toLocaleString('en-US')}</span>
        ))}
      </div>
      {/* labels: one column per bar, ellipsis-truncated, full name on hover */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, direction: 'ltr', marginTop: 4, minHeight: 42 }}>
        {data.map((d, i) => (
          <div key={i} title={d.label} style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', fontSize: 10.5, color: 'var(--soft)', padding: '0 2px' }}>
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
