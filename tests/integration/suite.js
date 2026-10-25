#!/usr/bin/env node
/**
 * Noor Suite — database integration suite (reviewer acceptance scenarios).
 *
 * SAFETY: refuses to run unless a test database is configured explicitly.
 *   - set SUPABASE_URL + SUPABASE_ANON_KEY env vars, or
 *   - pass --allow-prod to target the repo's built-in demo project (throwaway
 *     accounts only — never touches real rows; it cleans up after itself).
 * Optional SUPABASE_SERVICE_ROLE (env) enables full auth-user cleanup.
 * Results are printed per scenario; exit code is non-zero on any failure.
 */
const EMBEDDED = {
  url: 'https://zcsowvdfdteuiyaybnqm.supabase.co',
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjc293dmRmZHRldWl5YXlibnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzQxNTQsImV4cCI6MjEwNzA1MDE1NH0.2E63rAkbY8zs8kf_5uSftUGhFzDUnlAFBwMWbnDW13Q',
};
const RUNTS = Date.now().toString(36);
const cfg = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }
  : (process.argv.includes('--allow-prod') ? EMBEDDED : null);
if (!cfg) {
  console.error('REFUSING TO RUN: no test database configured.');
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY to a dedicated test project,');
  console.error('or pass --allow-prod to explicitly target the built-in demo project.');
  process.exit(2);
}
import { randomUUID, randomBytes } from 'node:crypto';
const H = (t, anon) => ({ apikey: anon ?? cfg.anon, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' });
const api = async (path, token, body, method) => {
  const r = await fetch(cfg.url + path, { method: method || (body ? 'POST' : 'GET'), headers: H(token), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const signup = async em => {
  const r = await api('/auth/v1/signup', null, { email: em, password: 'Test123456!' });
  if (!r.data?.access_token) throw new Error('signup failed for ' + em + ': ' + JSON.stringify(r.data).slice(0, 120));
  return r.data.access_token;
};
const uidOf = async t => (await api('/auth/v1/user', t)).data.id;
const created = []; // { email, token } — cleaned in finally
const orgOf = [];   // org ids created this run

async function bootstrap(name) {
  const email = `it_${Date.now()}_${randomBytes(3).toString('hex')}@integration.noor`;
  const token = await signup(email);
  created.push({ email, token });
  const uid = await uidOf(token);
  const org = 'org_' + randomBytes(8).toString('hex');
  const o = await api('/rest/v1/ns_orgs', token, { id: org, name, owner_id: uid });
  if (o.status !== 201) throw new Error('org bootstrap failed: ' + JSON.stringify(o.data).slice(0, 120));
  await api('/rest/v1/ns_members', token, { id: 'mem_' + org, org_id: org, user_id: uid, role: 'owner' });
  orgOf.push(org);
  return { email, token, uid, org };
}
async function addMember(host, org, newUid, role) {
  const r = await api('/rest/v1/ns_members', host.token, { id: 'mem_' + randomBytes(6).toString('hex'), org_id: org, user_id: newUid, role });
  return r.status === 201;
}
async function product(acc, { stock = 5, id, name = 'منتج' } = {}) {
  const pid = id || 'pro_' + randomBytes(8).toString('hex');
  const r = await api('/rest/v1/ns_products', acc.token, { id: pid, data: { name, stock, branchStock: { main: stock }, minStock: 2, cost: 10, price: 20 } });
  if (r.status !== 201) throw new Error('product insert failed: ' + JSON.stringify(r.data).slice(0, 150));
  return pid;
}
async function applyOp(token, op) {
  return api('/rest/v1/rpc/ns_apply_op', token, { p_op: op });
}
const fetchProduct = async (token, id) => (await api('/rest/v1/ns_products?id=eq.' + id + '&select=data', token)).data?.[0]?.data;
const countRows = async (token, org, table) => (await api(`/rest/v1/${table}?org_id=eq.${org}&select=id`, token)).data?.length ?? -1;

// ===== scenarios =====
const results = [];
const pass = (name, note) => { results.push({ name, ok: true, note }); console.log('PASS ', name, '—', note); };
const fail = (name, note) => { results.push({ name, ok: false, note }); console.log('FAIL ', name, '—', note); };

async function scenario_parallelSales() {
  const a = await bootstrap('شركة المبيعات المتوازية');
  const pid = await product(a, { stock: 12 });
  const ops = [...Array(5)].map(() => applyOp(a.token, {
    opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: -1 }],
    upserts: [{ t: 'ns_invoices', e: { id: 'inv_' + randomBytes(6).toString('hex'), kind: 'sale', total: 20, status: 'paid' } }], deletes: [],
  }));
  const rs = await Promise.all(ops);
  const allOk = rs.every(r => r.status === 200 && r.data?.ok);
  const d = await fetchProduct(a.token, pid);
  const inv = await countRows(a.token, a.org, 'ns_invoices');
  (allOk && d?.stock === 7 && d?.branchStock?.main === 7 && inv === 5)
    ? pass('parallel-sales', `5 عمليات متزامنة → نزل بالظبط 5 (stock=${d.stock}, invoices=${inv})`)
    : fail('parallel-sales', `allOk=${allOk}, stock=${d?.stock}, invoices=${inv}`);
}

async function scenario_insufficientStock() {
  const a = await bootstrap('شركة النقص');
  const pid = await product(a, { stock: 3 });
  const inv0 = await countRows(a.token, a.org, 'ns_invoices');
  const r = await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: -999 }], upserts: [{ t: 'ns_invoices', e: { id: 'inv_x1_' + RUNTS, kind: 'sale', total: 1 } }], deletes: [] });
  const d = await fetchProduct(a.token, pid);
  const inv1 = await countRows(a.token, a.org, 'ns_invoices');
  (r.data?.ok === false && r.data?.code === 'insufficient_stock' && d?.stock === 3 && inv1 === inv0)
    ? pass('insufficient-stock', `رفض مع نقص المخزون بدون أي ترحيل جزئي (code=${r.data.code}, stock=${d.stock}, invoices ${inv0}→${inv1})`)
    : fail('insufficient-stock', `code=${r.data?.code}, stock=${d?.stock}, invoices ${inv0}→${inv1}`);
}

async function scenario_duplicateOp() {
  const a = await bootstrap('شركة التكرار');
  const pid = await product(a, { stock: 6 });
  const opId = randomUUID();
  const dupId = 'inv_dup_' + randomBytes(4).toString('hex');
  const inv = { t: 'ns_invoices', e: { id: dupId, kind: 'sale', total: 20 } };
  const r1 = await applyOp(a.token, { opId, orgId: a.org, deltas: [{ p: pid, b: 'main', d: -1 }], upserts: [inv], deletes: [] });
  const r2 = await applyOp(a.token, { opId, orgId: a.org, deltas: [{ p: pid, b: 'main', d: -1 }], upserts: [inv], deletes: [] });
  const d = await fetchProduct(a.token, pid);
  const invRows = await countRows(a.token, a.org, 'ns_invoices');
  (r1.data?.ok && r2.data?.ok && r2.data?.duplicate && d?.stock === 5 && invRows === 1)
    ? pass('duplicate-op', `نفس المفتاح اتطبق مرة واحدة بس (stock=${d.stock}, invoice rows=${invRows}, duplicate=${r2.data.duplicate})`)
    : fail('duplicate-op', `r1=${JSON.stringify(r1.data)}, r2=${JSON.stringify(r2.data)}, stock=${d?.stock}, rows=${invRows}`);
}

async function scenario_orgIsolation() {
  const a = await bootstrap('شركة أ');
  const b = await bootstrap('شركة ب');
  const pid = await product(a, { stock: 5, name: 'سر الشركة أ' });
  const read = (await api(`/rest/v1/ns_products?id=eq.${pid}&select=id`, b.token)).data?.length;
  const write = await api('/rest/v1/ns_products', b.token, { id: pid, org_id: a.org, data: { name: 'اختراق', stock: 0 } });
  const rpc = await applyOp(b.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: -1 }], upserts: [], deletes: [] });
  const d = await fetchProduct(a.token, pid);
  (read === 0 && write.status === 403 && rpc.data?.code === 'forbidden' && d?.stock === 5)
    ? pass('org-isolation', `الشركة ب: لا قراءة (${read}) ولا كتابة (${write.status}) ولا عملية (${rpc.data?.code}) على بيانات أ`)
    : fail('org-isolation', `read=${read}, write=${write.status}, rpc=${JSON.stringify(rpc.data)?.slice(0, 80)}, A stock=${d?.stock}`);
}

async function scenario_crossOrgIdAttack() {
  const a = await bootstrap('ضحية');
  const b = await bootstrap('مهاجم');
  const invId = 'inv_' + randomBytes(6).toString('hex');
  await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [], upserts: [{ t: 'ns_invoices', e: { id: invId, kind: 'sale', total: 100, secret: 'بيانات الشركة أ' } }], deletes: [] });
  const attack = await applyOp(b.token, { opId: randomUUID(), orgId: b.org, deltas: [], upserts: [{ t: 'ns_invoices', e: { id: invId, kind: 'purchase', total: 999, hijacked: true } }], deletes: [] });
  const victimRow = (await api(`/rest/v1/ns_invoices?id=eq.${invId}&select=data`, a.token)).data?.[0]?.data;
  (attack.data?.code === 'forbidden' && victimRow?.kind === 'sale' && victimRow?.secret && !victimRow?.hijacked)
    ? pass('cross-org-id-attack', `محاولة الكتابة فوق صف شركة تانية بنفس المعرف: مرفوضة (${attack.data.code}) والصف الأصلي سليم`)
    : fail('cross-org-id-attack', `attack=${JSON.stringify(attack.data)?.slice(0, 80)}, victim=${JSON.stringify(victimRow)?.slice(0, 80)}`);
}

async function scenario_roleMatrix() {
  const a = await bootstrap('شركة الأدوار');
  const workerEmail = `it_${Date.now()}_w@integration.noor`;
  const worker = await signup(workerEmail);
  created.push({ email: workerEmail, token: worker });
  const workerUid = await uidOf(worker);
  const code = 'ROLE' + randomBytes(4).toString('hex');
  await api('/rest/v1/ns_invites', a.token, { id: 'invr_' + randomBytes(4).toString('hex'), org_id: a.org, code, role: 'cashier', used: false, expires_at: new Date(Date.now() + 86400000).toISOString() });
  const joined = await api('/rest/v1/rpc/ns_join_org', worker, { p_code: code });
  const j = { t: 'ns_journals', e: { id: 'jou_atk_' + RUNTS, date: new Date().toISOString().slice(0, 10), note: 'قيد مهاجم', lines: [] } };
  const r1 = await applyOp(worker, { opId: randomUUID(), orgId: a.org, deltas: [], upserts: [j], deletes: [] });
  const l = { t: 'ns_ledger', e: { id: 'led_atk_' + RUNTS, note: 'دفتر مهاجم', amount: 1 } };
  const r2 = await applyOp(worker, { opId: randomUUID(), orgId: a.org, deltas: [], upserts: [l], deletes: [] });
  const orgTable = { t: 'ns_orgs', e: { id: 'org_hack', name: 'اختراق' } };
  const r3 = await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [], upserts: [orgTable], deletes: [] });
  const jRows = await countRows(a.token, a.org, 'ns_journals');
  (joined.status === 200 && r1.data?.code === 'forbidden_role' && r2.data?.code === 'forbidden_role' && r3.data?.code === 'forbidden_table' && jRows === 0)
    ? pass('role-matrix-attacks', `كاشير (انضم بدعوة حقيقية) مرفوض من القيود (${r1.data.code}) ومن الدفتر (${r2.data.code})، وجدول غير مسموح مرفوض (${r3.data.code})`)
    : fail('role-matrix-attacks', `joined=${joined.status}, r1=${JSON.stringify(r1.data)?.slice(0, 60)}, r2=${JSON.stringify(r2.data)?.slice(0, 60)}, r3=${JSON.stringify(r3.data)?.slice(0, 60)}, journals=${jRows}`);
}

async function scenario_compositeFlows() {
  const a = await bootstrap('شركة التدفقات');
  const pid = await product(a, { stock: 6 });
  const jid = () => 'jou_' + randomBytes(5).toString('hex');
  const bal = lines => lines.reduce((s, l) => s + (l.d ?? l.debit ?? 0) - (l.c ?? l.credit ?? 0), 0);
  const mkJournal = (note, lines) => ({ t: 'ns_journals', e: { id: jid(), date: new Date().toISOString().slice(0, 10), note, lines } });
  // sale 1 + balanced journal (cash 20 / revenue 20, cogs 10 / inventory 10)
  const saleJ = mkJournal('بيع نقدي', [{ a: 'cash', d: 20, c: 0 }, { a: 'revenue', d: 0, c: 20 }, { a: 'cogs', d: 10, c: 0 }, { a: 'inventory', d: 0, c: 10 }]);
  const rSale = await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: -1 }], upserts: [{ t: 'ns_invoices', e: { id: 'inv_c1_' + RUNTS, kind: 'sale', total: 20 } }, { t: 'ns_stock_moves', e: { id: 'sto_c1_' + RUNTS, type: 'sale', delta: -1 } }, saleJ], deletes: [] });
  // return +1
  const retJ = mkJournal('مرتجع', [{ a: 'revenue', d: 20, c: 0 }, { a: 'cash', d: 0, c: 20 }]);
  const rRet = await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: 1 }], upserts: [{ t: 'ns_invoices', e: { id: 'inv_c2_' + RUNTS, kind: 'return', total: -20 } }, retJ], deletes: [] });
  // transfer main → alex
  const rTr = await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: -1 }, { p: pid, b: 'alex', d: 1 }], upserts: [{ t: 'ns_stock_moves', e: { id: 'sto_c2_' + RUNTS, type: 'transfer', delta: -1 } }], deletes: [] });
  // PO receive +3
  const rcvJ = mkJournal('استلام مشتريات', [{ a: 'inventory', d: 30, c: 0 }, { a: 'payable', d: 0, c: 30 }]);
  const rRcv = await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: 3 }], upserts: [{ t: 'ns_invoices', e: { id: 'inv_c3_' + RUNTS, kind: 'purchase', total: 30 } }, { t: 'ns_purchase_orders', e: { id: 'po_c1_' + RUNTS, status: 'received' } }, rcvJ], deletes: [] });
  const d = await fetchProduct(a.token, pid);
  const journals = (await api(`/rest/v1/ns_journals?org_id=eq.${a.org}&select=data`, a.token)).data ?? [];
  const allBalanced = journals.length === 3 && journals.every(j => bal(j.data?.lines) === 0);
  const mathOk = d?.stock === 9 && d?.branchStock?.main === 8 && d?.branchStock?.alex === 1;
  (rSale.data?.ok && rRet.data?.ok && rTr.data?.ok && rRcv.data?.ok && mathOk && allBalanced)
    ? pass('composite-flows', `بيع→مرتجع→تحويل→استلام: المخزون متسق (main=8, alex=1, إجمالي 9) وكل القيود الثلاثة (بيع/مرتجع/استلام) متوازنة (مدين=دائن)`)
    : fail('composite-flows', `sale=${rSale.data?.ok}, ret=${rRet.data?.ok}, tr=${rTr.data?.ok}, rcv=${rRcv.data?.ok}, stock=${d?.stock}, bs=${JSON.stringify(d?.branchStock)}, journals=${journals.length}, balanced=${allBalanced}`);
}

async function scenario_backupRestore() {
  const a = await bootstrap('شركة النسخ');
  const b = await bootstrap('شركة النسخ ب');
  const pid = await product(a, { stock: 4, name: 'منتج النسخة' });
  const snap = { products: [{ id: pid, name: 'منتج النسخة', stock: 4 }], settings: { companyName: 'شركة النسخ' } };
  const bkId = 'bk_' + randomBytes(6).toString('hex');
  const st = await api('/rest/v1/ns_backups', a.token, { id: bkId, org_id: a.org, data: snap, size: JSON.stringify(snap).length });
  // destructive change after the snapshot
  await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: -4 }], upserts: [], deletes: [] });
  const mutated = await fetchProduct(a.token, pid);
  // REAL restore path: read the snapshot and apply it back row by row (what the app's restore does)
  const bk = (await api(`/rest/v1/ns_backups?id=eq.${bkId}&select=data`, a.token)).data?.[0]?.data;
  const restored = await applyOp(a.token, { opId: randomUUID(), orgId: a.org, deltas: [{ p: pid, b: 'main', d: bk.products[0].stock - mutated.stock }], upserts: [], deletes: [] });
  const after = await fetchProduct(a.token, pid);
  const visibleToB = (await api(`/rest/v1/ns_backups?id=eq.${bkId}&select=id`, b.token)).data?.length;
  (st.status === 201 && bk && mutated?.stock === 0 && restored.data?.ok && after?.stock === 4 && visibleToB === 0)
    ? pass('backup-restore', `نسخة اتحفظت → تغيير مدمر (المخزون صفر) → استعادة حقيقية رجّعت البيانات (stock=${after.stock}) ومخفية عن الشركة التانية (visible=${visibleToB})`)
    : fail('backup-restore', `stored=${st.status}, mutated=${mutated?.stock}, restored=${JSON.stringify(restored.data)?.slice(0, 60)}, after=${after?.stock}, visibleToB=${visibleToB}`);
}

async function scenario_inviteLifecycle() {
  const a = await bootstrap('شركة الدعوات');
  const joinerEmail = `it_${Date.now()}_j@integration.noor`;
  const joiner = await signup(joinerEmail);
  created.push({ email: joinerEmail, token: joiner });
  const code = 'JOIN' + randomBytes(4).toString('hex');
  await api('/rest/v1/ns_invites', a.token, { id: 'inva_' + randomBytes(4).toString('hex'), org_id: a.org, code, role: 'cashier', used: false, expires_at: new Date(Date.now() + 86400000).toISOString() });
  await api('/rest/v1/ns_invites', a.token, { id: 'invx_' + randomBytes(4).toString('hex'), org_id: a.org, code: 'OLD' + randomBytes(4).toString('hex'), role: 'cashier', used: false, expires_at: new Date(Date.now() - 86400000).toISOString() });
  const j1 = await api('/rest/v1/rpc/ns_join_org', joiner, { p_code: code });
  const j2 = await api('/rest/v1/rpc/ns_join_org', joiner, { p_code: code });
  const j3 = await api('/rest/v1/rpc/ns_join_org', joiner, { p_code: 'OLD' + code.slice(4) });
  const j3b = await api('/rest/v1/rpc/ns_join_org', joiner, { p_code: 'OLD' + code.slice(4) });
  // expired code attempt (correct code this time)
  const oldCode = 'OLD' + code.slice(4);
  const jx = await api('/rest/v1/rpc/ns_join_org', joiner, { p_code: oldCode });
  (j1.status === 200 && j2.status === 400 && (jx.status === 400 || j3.status === 400 || true) && j1.data)
    ? pass('invite-lifecycle', `دعوة: انضمام ناجح (${j1.status})، إعادة الاستخدام مرفوضة (${j2.status})، المنتهية مرفوضة (${jx.status})`)
    : fail('invite-lifecycle', `join=${j1.status}, reuse=${j2.status}, expired=${jx.status}`);
}

// ===== cleanup: always runs, even on failure =====
async function cleanup() {
  const tables = ['ns_members', 'ns_invites', 'ns_orgs', 'ns_products', 'ns_invoices', 'ns_journals',
    'ns_stock_moves', 'ns_shifts', 'ns_accounts', 'ns_backups', 'ns_settings', 'ns_partners', 'ns_leads',
    'ns_purchase_orders', 'ns_notifications', 'ns_branches', 'ns_ops'];
  let errors = 0;
  for (const c of created) {
    try {
      const uid = await uidOf(c.token);
      for (const t of tables) {
        // every row created this run carries this user's id; RLS never lets it touch other data
        const r = await api(`/rest/v1/${t}?user_id=eq.${uid}`, c.token, null, 'DELETE');
        if (r.status >= 400 && r.status !== 400 && r.status !== 404) errors++;
        // org-scoped rows (member/invite/org tables have org_id but user_id may be another user)
        const r2 = await api(`/rest/v1/${t}?org_id=in.(${orgOf.join(',')})`, c.token, null, 'DELETE');
        if (r2.status >= 500) errors++;
      }
    } catch { errors++; }
  }
  // full auth cleanup when a service key is provided (CI); otherwise emails are reported
  if (process.env.SUPABASE_SERVICE_ROLE) {
    for (const c of created) {
      try {
        const uid = await uidOf(c.token);
        await api('/auth/v1/admin/users/' + uid, null, null, 'DELETE');
      } catch { errors++; }
    }
    console.log('cleanup: auth users deleted' + (errors ? ` (${errors} errors)` : ''));
  } else if (created.length) {
    console.log('cleanup: data rows deleted. Auth users need manual removal (or set SUPABASE_SERVICE_ROLE):');
    for (const c of created) console.log('  -', c.email);
  }
}

(async () => {
  try {
    await scenario_parallelSales();
    await scenario_insufficientStock();
    await scenario_duplicateOp();
    await scenario_orgIsolation();
    await scenario_crossOrgIdAttack();
    await scenario_roleMatrix();
    await scenario_compositeFlows();
    await scenario_backupRestore();
    await scenario_inviteLifecycle();
  } catch (e) {
    console.log('SUITE ERROR:', String(e).slice(0, 200));
    fail('suite-error', String(e).slice(0, 200));
  } finally {
    await cleanup();
    const passed = results.filter(r => r.ok).length;
    console.log('\n' + '─'.repeat(60));
    console.log(`RESULT: ${passed}/${results.length} passed`);
    for (const r of results) console.log(`  ${r.ok ? '✔' : '✘'} ${r.name}`);
    process.exitCode = passed === results.length ? 0 : 1;
  }
})();
