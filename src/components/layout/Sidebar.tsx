import { useState } from 'react';
import { routes, RoutePath } from '../../router/router';
import { useStore } from '../../store/AppStore';
import { useT } from '../../i18n/I18n';

interface Props { route: RoutePath; onNavigate: (p: RoutePath) => void; }

const icons: Record<string, string> = {
  dashboard: '◧', pos: '▣', sales: '▤', purchases: '▦', inventory: '❋',
  partners: '☺', crm: '◈', hr: '✚', projects: '◫', accounting: '₪',
  reports: '▤▤', calendar: '▦▦', settings: '⚙',
};

const groups: { label: string; items: RoutePath[] }[] = [
  { label: 'الرئيسية', items: ['dashboard', 'pos'] },
  { label: 'المبيعات', items: ['sales', 'crm', 'partners'] },
  { label: 'المخازن', items: ['inventory', 'purchases'] },
  { label: 'الإدارة', items: ['hr', 'projects', 'accounting'] },
  { label: 'التحليلات', items: ['reports', 'calendar', 'settings'] },
];

export function Sidebar({ route, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const { settings, setSettings } = useStore();
  const t = useT();
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-badge">N</div>
          <div>
            <div className="brand-name">{t('app_name')}</div>
            <div className="brand-sub">{t('app_sub')}</div>
          </div>
        </div>
        <nav className="side-links" onClick={() => setOpen(false)}>
          {groups.map(g => (
            <div key={g.label}>
              <div className="side-group">{g.label}</div>
              {g.items.map(p => (
                <a key={p} className={`side-link ${route === p ? 'active' : ''}`} onClick={() => onNavigate(p)}>
                  <span style={{ width: 18, textAlign: 'center' }}>{icons[p]}</span>
                  {routes.find(r => r.path === p)!.title}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: 8, padding: '0 6px' }}>
          <button className="btn btn-sm btn-outline grow" onClick={() => setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
            {settings.theme === 'dark' ? '☀' : '☾'} {t('dark_mode')}
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => setSettings({ lang: settings.lang === 'ar' ? 'en' : 'ar' })}>
            {t('language')}
          </button>
        </div>
      </aside>
      <button className="burger" style={{ position: 'fixed', bottom: 18, insetInlineEnd: 18, zIndex: 60, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 999, width: 44, height: 44, fontSize: 18 }} onClick={() => setOpen(o => !o)}>☰</button>
    </>
  );
}
