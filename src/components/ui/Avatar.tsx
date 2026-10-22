import { initials } from '../../lib/format';

const TONES = ['var(--primary-soft)', 'var(--green-soft)', 'var(--amber-soft)', 'var(--blue-soft)'];
const INKS = ['var(--primary)', 'var(--green)', 'var(--amber)', 'var(--blue)'];

export function Avatar({ name, size = 36, seed = 0 }: { name: string; size?: number; seed?: number }) {
  const i = seed % TONES.length;
  return (
    <span style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: TONES[i], color: INKS[i], fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42,
    }}>{initials(name)}</span>
  );
}
