/** Dependency-free line chart — SVG graph + crisp HTML labels (no distorted canvas text). */
interface Datum { label: string; value: number }

export function LineChart({ data, height = 200, color = '#4f46e5' }: { data: Datum[]; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 0.0001);
  const H = height - 26;
  const x = (i: number) => (i / (data.length - 1)) * 100;
  const y = (v: number) => H - (v / max) * H;
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  // show at most ~6 x labels so long month names never collide
  const skip = Math.ceil(data.length / 6);
  return (
    <div>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
        <polygon points={`0,${H} ${pts} 100,${H}`} fill={color} opacity="0.12" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r="1" fill={color} />)}
      </svg>
      <div style={{ position: 'relative', height: 22, direction: 'ltr', fontSize: 10.5, color: 'var(--soft)', whiteSpace: 'nowrap' }}>
        {data.map((d, i) => (i % skip === 0 || i === data.length - 1) && (
          <span key={i} style={{
            position: 'absolute',
            left: `${x(i)}%`,
            transform: i === 0 ? 'none' : i === data.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
          }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
