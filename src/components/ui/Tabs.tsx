interface Tab { key: string; label: string }

export function Tabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      {tabs.map(tb => (
        <button key={tb.key} className={`chip ${active === tb.key ? 'on' : ''}`} onClick={() => onChange(tb.key)}>
          {tb.label}
        </button>
      ))}
    </div>
  );
}
