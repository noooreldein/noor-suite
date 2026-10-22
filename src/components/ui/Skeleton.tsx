export function Skeleton({ h = 14, w = '100%' }: { h?: number; w?: string }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 8,
      background: 'linear-gradient(90deg, var(--line) 25%, var(--bg) 50%, var(--line) 75%)',
      backgroundSize: '200% 100%',
      animation: 'sk 1.2s infinite linear',
    }} />
  );
}
