import { useT } from '../../i18n/I18n';

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const t = useT();
  return (
    <div className="searchbox">
      <input value={value} placeholder={placeholder ?? t('search')} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
