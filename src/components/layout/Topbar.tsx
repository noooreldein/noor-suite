import { useT } from '../../i18n/I18n';
import { useStore } from '../../store/AppStore';
import { GlobalSearch } from '../system/GlobalSearch';

export function Topbar({ title }: { title: string }) {
  const t = useT();
  const { data, branch, setBranch } = useStore();
  const date = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="gs-trigger" onClick={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); }}>
          بحث سريع <span className="gs-kbd">Ctrl K</span>
        </button>
        {data.branches.length > 1 && (
          <select value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 'auto', padding: '6px 10px' }}>
            {data.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <span className="badge b-primary">{date}</span>
      </div>
      <GlobalSearch />
    </header>
  );
}
