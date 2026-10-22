export function Progress({ value, tone = 'var(--primary)' }: { value: number; tone?: string }) {
  return (
    <div style={{ background: 'var(--line)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone, height: '100%', borderRadius: 99, transition: 'width .3s' }} />
    </div>
  );
}
