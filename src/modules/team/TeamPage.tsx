/** Team & roles — members, invite codes, org switching (multi-tenant). */
import { useEffect, useState } from 'react';
import { useOrg } from '../../org/Org';
import { useStore } from '../../store/AppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import * as backend from '../../lib/backend';
import type { Role } from '../../lib/permissions';
import { ROLE_LABEL, ALL_ROLES, MANAGER_UP } from '../../lib/permissions';
import { fmtDate } from '../../lib/dates';

export function TeamPage() {
  const { data, toast } = useStore();
  const { org, orgs, members, invites, refresh, switchOrg, setMembers, setInvites } = useOrg();
  const [inviteRole, setInviteRole] = useState<Role>('cashier');
  const [newCode, setNewCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');

  const isOwner = org?.role === 'owner';
  const isManagerUp = !org || MANAGER_UP.includes(org.role as Role);

  useEffect(() => { if (data.settings) void 0; }, [data.settings]);

  const createInvite = async () => {
    const code = await backend.createInvite(inviteRole);
    if (!code) return toast('تعذر إنشاء الدعوة', 'err');
    setNewCode(code);
    setInvites(await backend.listInvites());
  };

  const joinByCode = async () => {
    if (!joinCode.trim()) return;
    const orgId = await backend.joinOrg(joinCode);
    if (!orgId) return toast('الكود غير صالح أو منتهي الصلاحية', 'err');
    localStorage.setItem('ns_active_org', orgId);
    toast('تم انضمامك لمساحة العمل — جاري التحميل ✓');
    setTimeout(() => location.reload(), 600);
  };

  const changeRole = async (m: any, role: Role) => {
    if (!isOwner) return toast('تغيير الأدوار متاح للمالك فقط', 'err');
    if (await backend.setMemberRole(m.id, role)) {
      setMembers(members.map(x => x.id === m.id ? { ...x, role } : x));
      toast(`تم تحديث دور العضو إلى ${ROLE_LABEL[role]} ✓`);
    } else toast('تعذر تحديث الدور', 'err');
  };

  const kick = async (m: any) => {
    if (!isOwner) return;
    if (await backend.removeMember(m.id)) {
      setMembers(members.filter(x => x.id !== m.id));
      toast('تم إزالة العضو من مساحة العمل');
    } else toast('تعذر إزالة العضو', 'err');
  };

  if (!org) {
    return (
      <div className="card"><div className="card-body">
        <h3>الشركة والفريق</h3>
        <p style={{ color: 'var(--soft)', fontSize: 13.5 }}>
          مساحة العمل والفريق والأدوار متاحة في الحساب السحابي (دخول/حساب جديد) — بياناتك المحلية الحالية بتترفع تلقائياً عند أول دخول.
        </p>
        {data.settings?.companyName && (
          <p style={{ marginTop: 10 }}>
            عندك كود دعوة من شركة؟
            <div className="row" style={{ marginTop: 8 }}>
              <input style={{ width: 200 }} value={joinCode} placeholder="كود الدعوة" onChange={e => setJoinCode(e.target.value.toUpperCase())} />
              <Button onClick={joinByCode}>انضمام</Button>
            </div>
          </p>
        )}
      </div></div>
    );
  }

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <div className="k-label">مساحة العمل</div>
          <div className="k-num" style={{ fontSize: 18 }}>{org.name}</div>
          <div className="k-sub">دورك: <Badge tone="primary">{ROLE_LABEL[org.role as Role]}</Badge></div>
        </div>
        <div className="kpi">
          <div className="k-label">أعضاء الفريق</div>
          <div className="k-num">{members.length}</div>
        </div>
        <div className="kpi">
          <div className="k-label">دعوات نشطة</div>
          <div className="k-num">{invites.filter(i => !i.used).length}</div>
        </div>
      </div>

      {orgs.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}><div className="card-body">
          <b>تبديل مساحة العمل</b>
          <div className="row" style={{ marginTop: 8 }}>
            {orgs.map(o => (
              <button key={o.id} className={`chip ${o.id === org.id ? 'on' : ''}`} onClick={() => switchOrg(o.id)}>
                {o.name} — {ROLE_LABEL[o.role as Role]}
              </button>
            ))}
          </div>
        </div></div>
      )}

      <div className="card">
        <div className="card-head"><h3>أعضاء الفريق</h3>
          {isOwner && <Button size="sm" variant="outline" onClick={() => { setRenaming(org.name); setName(org.name); }}>تغيير اسم الشركة</Button>}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <Table widths={['', '150px', '140px']} cols={['العضو', 'الدور', '']} rows={members}
            render={m => {
              const isSelf = m.user_id === (members.length ? null : null) || m.role === 'owner' && org.role === 'owner';
              return [
                <span key="u">
                  <b>{m.user_id.slice(0, 8)}</b>
                  {m.role === org.role && m.user_id === (org as any).ownerId ? <span /> : null}
                  <span className="muted" style={{ fontSize: 11 }}> {m.role === 'owner' ? 'مالك مساحة العمل' : ''}</span>
                </span>,
                <select key="r" value={m.role} disabled={!isOwner}
                  onChange={e => changeRole(m, e.target.value as Role)}
                  style={{ width: 130 }}>
                  {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>,
                <span key="a" className="row" style={{ gap: 6 }}>
                  {m.role !== 'owner' && isOwner && <Button size="sm" variant="danger" onClick={() => kick(m)}>إزالة</Button>}
                </span>,
              ];
            }}
            empty="لا أعضاء بعد" />
        </div>
      </div>

      {isManagerUp && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head"><h3>دعوات الانضمام</h3>
            <div className="row">
              <select style={{ width: 140 }} value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}>
                {ALL_ROLES.filter(r => r !== 'owner').map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
              <Button size="sm" onClick={createInvite}>+ دعوة جديدة</Button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <Table widths={['', '120px', '110px', '120px', '110px']} cols={['الكود', 'الدور', 'الحالة', 'ينتهي', '']} rows={invites}
              render={i => [
                <b key="c" className="mono">{i.code}</b>,
                <Badge key="r" tone="primary">{ROLE_LABEL[i.role as Role]}</Badge>,
                i.used ? <Badge key="s" tone="gray">مستخدم</Badge> : <Badge key="s" tone="green">نشط</Badge>,
                <span key="e" className="mono" style={{ fontSize: 12 }}>{fmtDate(String(i.expires_at).slice(0, 10))}</span>,
                !i.used && isManagerUp ? <Button key="x" size="sm" variant="danger" onClick={async () => { await backend.deleteInvite(i.id); setInvites(await backend.listInvites()); }}>حذف</Button> : <span key="x" />,
              ]}
              empty="لا دعوات — أنشئ كود دعوة وابعتوه للموظف" />
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}><div className="card-body">
        <b>انضمام لمساحة عمل تانية</b>
        <p style={{ color: 'var(--soft)', fontSize: 13 }}>لو استلمت كود دعوة من شركة، اكتبه هنا:</p>
        <div className="row">
          <input style={{ width: 200 }} value={joinCode} placeholder="كود الدعوة" onChange={e => setJoinCode(e.target.value.toUpperCase())} />
          <Button onClick={joinByCode}>انضمام</Button>
        </div>
      </div></div>

      {newCode && (
        <Modal title="تم إنشاء الدعوة" onClose={() => setNewCode(null)} width={440}>
          <p style={{ fontSize: 13.5, color: 'var(--soft)' }}>ابعت الكود ده للموظف — بعد ما يعمل حساب (أو من حسابه الحالي) يفتح صفحة «الفريق» ويكتبه في «انضمام».</p>
          <div className="kpi" style={{ textAlign: 'center', padding: 20 }}>
            <b className="mono" style={{ fontSize: 26, letterSpacing: 4 }}>{newCode}</b>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
            <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(newCode); toast('تم نسخ الكود'); }}>نسخ</Button>
            <Button variant="outline" onClick={async () => {
              const url = `https://wa.me/?text=${encodeURIComponent(`انضم لفريقنا على نور سويت — كود الدعوة: ${newCode}`)}`;
              window.open(url, '_blank');
            }}>مشاركة واتساب</Button>
          </div>
        </Modal>
      )}

      {renaming && (
        <Modal title="اسم الشركة" onClose={() => setRenaming(null)} width={420}>
          <input value={name} onChange={e => setName(e.target.value)} />
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
            <Button variant="outline" onClick={() => setRenaming(null)}>إلغاء</Button>
            <Button onClick={async () => {
              if (!name.trim()) return;
              if (await backend.renameOrg(name.trim())) {
                toast('تم تحديث اسم الشركة ✓');
                await refresh();
                setRenaming(null);
              } else toast('تعذر التحديث', 'err');
            }}>حفظ</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
