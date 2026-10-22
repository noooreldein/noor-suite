export function Spinner({ size = 22 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${Math.max(2, size / 9)}px solid var(--line)`,
      borderTopColor: 'var(--primary)',
      animation: 'spin .8s linear infinite',
      margin: '0 auto',
    }} />
  );
}
