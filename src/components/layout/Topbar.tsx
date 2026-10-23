import { useT } from '../../i18n/I18n';
import { GlobalSearch } from '../system/GlobalSearch';

export function Topbar({ title }: { title: string }) {
  const t = useT();
  const date = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="gs-trigger" onClick={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); }}>
          بحث سريع <span className="gs-kbd">Ctrl K</span>
        </button>
        <span className="badge b-primary">{date}</span>
      </div>
      <GlobalSearch />
    </header>
  );
}
