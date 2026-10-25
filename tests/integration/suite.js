/**
 * Noor Suite — database integration suite
 * =========================================
 * Runs the reviewer's core scenarios against a REAL Supabase project over
 * REST with throwaway accounts (they are created per run and listed at the
 * end for deletion — see "Cleanup" in the README).
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   node tests/integration/suite.js
 *
 * Scenarios (each must PASS for a release):
 *   1. parallel-sales        concurrent devices, zero lost updates
 *   2. insufficient-stock    rejected cleanly, no partial writes
 *   3. duplicate-op          repeated opId applies exactly once (idempotency)
 *   4. org-isolation         two companies cannot see or touch each other
 *   5. composite-flows       return + transfer + PO receive keep books balanced
 *   6. backup-roundtrip      snapshot write + read-back integrity
 */

const SB = process.env.SUPABASE_URL || 'https://zcsowvdfdteuiyaybnqm.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjc293dmRmZHRldWl5YXlibnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzQxNTQsImV4cCI6MjEwNzA1MDE1NH0.2E63rAkbY8zs8kf_5uSftUGhFzDUnlAFBwMWbnDW13Q';
const RUN = Date.now();
const results = [];
const createdAccounts = [];
let pass = true;

const ok = (name, cond, detail = '') => {
  results.push({ name, ok: !!cond, detail });
  if (!cond) pass = false;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const api = async (path, token, body, method = 'POST') => {
  const r = await fetch(SB + path, {
    method,
    headers: {
      apikey: ANON,
      Authorization: 'Bearer ' + (token || ANON),
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
};

const signup = async (label) => {
  const email = `it_${label}_${RUN}@integration.noor`;
  const r = await api('/auth/v1/signup', null, { email, password: 'Integration!2026' });
  const token = r.data?.access_token;
  if (!token) throw new Error('signup failed: ' + JSON.stringify(r.data).slice(0, 120));
  createdAccounts.push(email);
  return { email, token };
};

const bootstrapOrg = async (token, name) => {
  const orgId = 'org_it_' + Math.random().toString(36).slice(2, 10);
  await api('/rest/v1/ns_orgs', token, { id: orgId, name, owner_id: (await whoami(token)).id });
  await api('/rest/v1/ns_members', token, { id: 'mem_' + Math.random().toString(36).slice(2, 10), org_id: orgId, user_id: (await whoami(token)).id, role: 'owner' });
  return orgId;
};

let _me = new Map();
const whoami = async (token) => {
  if (!_me.has(token)) {
    const r = await api('/auth/v1/user', token, null, 'GET');
    _me.set(token, r.data);
  }
  return _me.get(token);
};

const insertProduct = async (token, org, name, stock) => {
  const id = 'pro_it_' + Math.random().toString(36).slice(2, 10);
  const r = await api('/rest/v1/ns_products', token, { id, org_id: org, data: { name, stock, cost: 10, price: 20, branchStock: { main: stock } } });
  if (r.status >= 400) throw new Error('product insert failed: ' + JSON.stringify(r.data).slice(0, 150));
  return id;
};

const getProduct = async (token, id) => {
  const r = await api(`/rest/v1/ns_products?id=eq.${id}&select=data`, token, null, 'GET');
  return r.data?.[0]?.data ?? null;
};

const applyOp = (token, op) => api('/rest/v1/rpc/ns_apply_op', token, { p_op: op });

const uuid = () => crypto.randomUUID();

(async () => {
  // ---------- setup: one throwaway account per company ----------
  const A = await signup('a');
  const orgA = await bootstrapOrg(A.token, 'شركة الاختبار أ');
  const B = await signup('b');
  const orgB = await bootstrapOrg(B.token, 'شركة الاختبار ب');

  // ---------- 1. parallel sales ----------
  {
    const p = await insertProduct(A.token, orgA, 'لابتوب اختبار', 12);
    const ops = [];
    for (let i = 0; i < 5; i++)
      ops.push(applyOp(A.token, {
        opId: uuid(), orgId: orgA,
        deltas: [{ p, b: 'main', d: -1 }],
        upserts: [{ t: 'ns_invoices', e: { id: 'inv_it_' + uuid().slice(0, 8), kind: 'sale', total: 20, status: 'paid' } }],
        deletes: [],
      }));
    const rs = await Promise.all(ops);
    const allOk = rs.every(x => x.status === 200 && x.data?.ok === true);
    const stock = (await getProduct(A.token, p))?.stock;
    const inv = await api(`/rest/v1/ns_invoices?org_id=eq.${orgA}&select=id`, A.token, null, 'GET');
    ok('parallel-sales: 5 concurrent sales → exactly 5 units out, zero lost updates',
      allOk && stock === 7 && inv.data.length === 5, `stock=${stock}, invoices=${inv.data.length}`);
  }

  // ---------- 2. insufficient stock ----------
  {
    const p = await insertProduct(A.token, orgA, 'شاشة اختبار', 3);
    const before = await getProduct(A.token, p);
    const invCount = (await api(`/rest/v1/ns_invoices?org_id=eq.${orgA}&select=id`, A.token, null, 'GET')).data.length;
    const r = await applyOp(A.token, {
      opId: uuid(), orgId: orgA,
      deltas: [{ p, b: 'main', d: -99 }],
      upserts: [{ t: 'ns_invoices', e: { id: 'inv_it_' + uuid().slice(0, 8), kind: 'sale', total: 100 } }],
      deletes: [],
    });
    const after = await getProduct(A.token, p);
    const invAfter = (await api(`/rest/v1/ns_invoices?org_id=eq.${orgA}&select=id`, A.token, null, 'GET')).data.length;
    ok('insufficient-stock: overdraw rejected, nothing applied (no partial state)',
      r.data?.ok === false && r.data?.code === 'insufficient_stock' && after.stock === before.stock && invAfter === invCount,
      `code=${r.data?.code}, stock=${before.stock}→${after.stock}, invoices ${invCount}→${invAfter}`);
  }

  // ---------- 3. duplicate operation (lost response replay) ----------
  {
    const p = await insertProduct(A.token, orgA, 'كيبورد اختبار', 10);
    const opId = uuid();
    const invId = 'inv_it_' + uuid().slice(0, 8);
    const op = {
      opId, orgId: orgA,
      deltas: [{ p, b: 'main', d: -2 }],
      upserts: [{ t: 'ns_invoices', e: { id: invId, kind: 'sale', total: 40, status: 'paid' } }],
      deletes: [],
    };
    const first = await applyOp(A.token, op);
    const replay = await applyOp(A.token, op); // same opId — e.g. network lost the first response
    const stock = (await getProduct(A.token, p))?.stock;
    const dup = (await api(`/rest/v1/ns_invoices?id=eq.${invId}&select=id`, A.token, null, 'GET')).data.length;
    ok('duplicate-op: replayed request with the same idempotency key applies exactly once',
      first.data?.ok === true && replay.data?.duplicate === true && stock === 8 && dup === 1,
      `stock=${stock} (expected 8), invoice rows=${dup}`);
  }

  // ---------- 4. org isolation ----------
  {
    const pA = await insertProduct(A.token, orgA, 'منتج شركة أ', 5);
    // B cannot READ A's products
    const readB = await api(`/rest/v1/ns_products?id=eq.${pA}&select=id`, B.token, null, 'GET');
    const seesNothing = (readB.data ?? []).length === 0;
    // B cannot WRITE into A's org (RLS write matrix)
    const writeB = await api('/rest/v1/ns_products', B.token, { id: 'pro_evil_' + uuid().slice(0, 8), org_id: orgA, data: { name: 'اختراق', stock: 1 } });
    // B cannot run an operation against A's org
    const opB = await applyOp(B.token, {
      opId: uuid(), orgId: orgA,
      deltas: [{ p: pA, b: 'main', d: -1 }],
      upserts: [{ t: 'ns_invoices', e: { id: 'inv_evil_' + uuid().slice(0, 8), kind: 'sale', total: 1 } }],
      deletes: [],
    });
    const stockA = (await getProduct(A.token, pA))?.stock;
    ok('org-isolation: company B cannot read, write, or operate on company A',
      seesNothing && writeB.status === 403 && opB.data?.ok === false && opB.data?.code === 'forbidden' && stockA === 5,
      `read=${(readB.data ?? []).length}, write=${writeB.status}, rpc=${opB.data?.code}, A stock=${stockA}`);
  }

  // ---------- 5. composite flows: return + transfer + PO receive ----------
  {
    const p = await insertProduct(A.token, orgA, 'ماوس اختبار', 6);
    const mk = () => 'inv_it_' + uuid().slice(0, 8);
    // sale: -1 + invoice + journal + move
    const sale = await applyOp(A.token, { opId: uuid(), orgId: orgA,
      deltas: [{ p, b: 'main', d: -1 }],
      upserts: [
        { t: 'ns_invoices', e: { id: mk(), kind: 'sale', total: 20, status: 'paid' } },
        { t: 'ns_journals', e: { id: 'jou_' + uuid().slice(0, 8), date: '2026-10-25', note: 'بيع', lines: [] } },
        { t: 'ns_stock_moves', e: { id: 'sto_' + uuid().slice(0, 8), type: 'sale', delta: -1 } },
      ], deletes: [] });
    // return: +1
    const ret = await applyOp(A.token, { opId: uuid(), orgId: orgA,
      deltas: [{ p, b: 'main', d: 1 }],
      upserts: [{ t: 'ns_invoices', e: { id: mk(), kind: 'return', total: -20, status: 'returned' } }], deletes: [] });
    // transfer main → alex: -1 main, +1 alex
    const alex = await applyOp(A.token, { opId: uuid(), orgId: orgA,
      deltas: [{ p, b: 'main', d: -1 }, { p, b: 'alex', d: 1 }], upserts: [], deletes: [] });
    // PO receive: +3
    const rcv = await applyOp(A.token, { opId: uuid(), orgId: orgA,
      deltas: [{ p, b: 'main', d: 3 }],
      upserts: [{ t: 'ns_invoices', e: { id: mk(), kind: 'purchase', total: 30, status: 'paid' } }], deletes: [] });
    const d = await getProduct(A.token, p);
    // 6 -1(sale) +1(return) -1(transfer out) +3(receive) = 8 main; alex +1 → total 9
    const mathOk = d.stock === 9 && d.branchStock.main === 8 && d.branchStock.alex === 1;
    const all = [sale, ret, alex, rcv].every(x => x.data?.ok === true);
    ok('composite-flows: sale→return→transfer→receive all applied, totals consistent',
      all && mathOk, `stock=${d.stock}, main=${d.branchStock.main}, alex=${d.branchStock.alex}`);
  }

  // ---------- 6. backup snapshot round-trip ----------
  {
    const p = await insertProduct(A.token, orgA, 'منتج النسخة', 4);
    const snapshot = { version: 2, products: [{ id: p, name: 'منتج النسخة', stock: 4 }], invoices: [], settings: { companyName: 'شركة الاختبار أ' } };
    const payload = JSON.stringify(snapshot);
    const put = await api('/rest/v1/ns_backups', A.token, { id: 'bk_it_' + uuid().slice(0, 8), org_id: orgA, data: snapshot, size: payload.length });
    const list = await api(`/rest/v1/ns_backups?org_id=eq.${orgA}&select=id,size,data&order=created_at.desc&limit=1`, A.token, null, 'GET');
    const row = list.data?.[0];
    const restored = row?.data;
    // semantic compare — jsonb legitimately reorders object keys
    const same = restored && restored.products?.length === 1
      && restored.products[0].id === p && restored.products[0].stock === 4
      && restored.products[0].name === 'منتج النسخة'
      && restored.settings?.companyName === 'شركة الاختبار أ';
    // B must not see A's backups
    const listB = await api(`/rest/v1/ns_backups?org_id=eq.${orgA}&select=id`, B.token, null, 'GET');
    ok('backup-roundtrip: snapshot stored and read back intact (and hidden from other orgs)',
      put.status < 300 && same && (listB.data ?? []).length === 0,
      `stored=${put.status < 300}, identical=${!!same}, visible-to-B=${(listB.data ?? []).length}`);
  }

  console.log('\n──────────────────────────────────────────────');
  console.log(`RESULT: ${results.filter(r => r.ok).length}/${results.length} passed`);
  results.forEach(r => console.log(`  ${r.ok ? '✔' : '✘'} ${r.name}`));
  console.log(`\nThrowaway accounts created by this run (delete via dashboard → Authentication):`);
  createdAccounts.forEach(e => console.log('  ' + e));
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('SUITE CRASHED:', e); process.exit(1); });
