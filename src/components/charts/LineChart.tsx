/** Dependency-free SVG line chart with area fill. */
interface Datum { label: string; value: number }

export function LineChart({ data, height = 200, color = '#4f46e5' }: { data: Datum[]; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 100, H = height - 30;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - (v / max) * H;
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="0.8" />
      {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="1" fill={color} />)}
      {data.map((d, i) => <text key={d.label} x={x(i)} y={height - 5} fontSize="7" textAnchor="middle" fill="var(--soft)">{d.label}</text>)}
    </svg>
  );
}
