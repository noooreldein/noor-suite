import { useT } from '../../i18n/I18n';

export function Topbar({ title }: { title: string }) {
  const t = useT();
  const date = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div style={{ marginInlineStart: 'auto' }}>
        <span className="badge b-primary">{date}</span>
      </div>
    </header>
  );
}
