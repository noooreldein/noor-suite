/** Cloud auth screen — login / signup / guest mode. */
import { useState } from 'react';

export function AuthScreen({ onDone, onGuest }: { onDone: () => void; onGuest: () => void }) {
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr('');
    const r = tab === 'in'
      ? await (await import('../../lib/backend')).signIn(email.trim(), pw)
      : await (await import('../../lib/backend')).signUp(email.trim(), pw);
    setBusy(false);
    if (r.error) setErr(r.error.message === 'Invalid login credentials' ? 'بيانات الدخول غير صحيحة' : r.error.message);
    else onDone();
  };

  return (
    <div className="onboarding">
      <div className="onb-card">
        <div className="onb-badge">N</div>
        <h1 className="onb-title">Noor Suite — حسابك</h1>
        <p className="onb-sub">سجّل الدخول لمزامنة بياناتك على كل أجهزتك (سحابة مشفرة، معزولة لكل حساب)</p>

        <div className="auth-tabs">
          <button className={tab === 'in' ? 'active' : ''} onClick={() => setTab('in')}>دخول</button>
          <button className={tab === 'up' ? 'active' : ''} onClick={() => setTab('up')}>حساب جديد</button>
        </div>

        <div className="onb-form">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني" type="email" />
          <input value={pw} onChange={e => setPw(e.target.value)} placeholder="كلمة المرور" type="password"
            onKeyDown={e => e.key === 'Enter' && submit()} />
          {err && <div style={{ color: '#dc2626', fontSize: 12 }}>{err}</div>}
        </div>

        <button className="btn btn-primary onb-cta" disabled={busy || !email || pw.length < 6} onClick={submit}>
          {busy ? 'لحظة…' : tab === 'in' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
        </button>
        <button className="onb-demo" disabled={busy} onClick={onGuest}>وضع الزائر — بيانات محلية على الجهاز فقط</button>
        <p className="onb-note">حساب جديد؟ بياناتك المحلية الحالية تترفع تلقائياً لحسابك عند أول دخول</p>
      </div>
    </div>
  );
}
