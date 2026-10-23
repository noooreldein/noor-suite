/** App lock screen — asks for the owner password. */
import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { sha256 } from '../../lib/hash';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { settings } = useStore();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);

  const tryUnlock = async () => {
    const h = await sha256(pw);
    if (h === settings?.passwordHash) onUnlock();
    else { setErr(true); setPw(''); }
  };

  return (
    <div className="onboarding">
      <div className="onb-card">
        <div className="onb-badge">N</div>
        <h1 className="onb-title">{settings?.companyName ?? 'Noor Suite'}</h1>
        <p className="onb-sub">النظام مقفل — أدخل كلمة مرور المسؤول للمتابعة</p>
        <div className="onb-form">
          <input type="password" value={pw} autoFocus
            onChange={e => { setPw(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            placeholder="كلمة المرور" style={{ textAlign: 'center', marginTop: 10 }} />
          {err && <div style={{ color: 'var(--red, #dc2626)', fontSize: 12 }}>كلمة المرور غير صحيحة</div>}
        </div>
        <button className="btn btn-primary onb-cta" disabled={!pw} onClick={tryUnlock}>فتح النظام</button>
      </div>
    </div>
  );
}
