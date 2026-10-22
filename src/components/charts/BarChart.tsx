/** Dependency-free SVG bar chart. */
interface Datum { label: string; value: number }

export function BarChart({ data, height = 200, color = 'var(--primary)' }: { data: Datum[]; height?: number; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 40);
        return (
          <g key={d.label}>
            <rect x={i * W + W * 0.2} y={height - 22 - h} width={W * 0.6} height={h} rx="1.5" fill={color} opacity="0.85" />
            <text x={i * W + W / 2} y={height - 7} fontSize="8" textAnchor="middle" fill="var(--soft)">{d.label}</text>
            {d.value > 0 && <text x={i * W + W / 2} y={height - 28 - h} fontSize="8" textAnchor="middle" fill="var(--ink)" fontWeight="600">{d.value}</text>}
          </g>
        );
      })}
    </svg>
  );
}
