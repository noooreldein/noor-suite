-- =============================================================================
-- Noor Suite — complete Supabase schema (v3.2.0)
-- =============================================================================
-- This script is IDEMPOTENT: every statement is CREATE IF NOT EXISTS /
-- CREATE OR REPLACE / DROP-IF-EXISTS-then-CREATE, so it can run safely on a
-- brand-new empty project as well as on an existing installation.
--
-- Install (fresh project):
--   1. Create a Supabase project (dashboard or CLI).
--   2. Dashboard -> SQL Editor -> paste this whole file -> Run.
--   3. Authentication -> Providers -> Email: enable signup.
--      (Optional) Auth -> Emails -> disable "Confirm email" for instant signup,
--      or keep confirmations if you prefer approving users manually.
--   4. Build the frontend with the project URL + anon key:
--        VITE_SUPABASE_URL=https://<ref>.supabase.co \
--        VITE_SUPABASE_ANON_KEY=<anon-key> npm run build
--      Without env vars the app falls back to the built-in hosted deployment.
--
-- Security model:
--   * The frontend only ever holds the PUBLIC anon key — safe because every
--     table is protected by Row Level Security.
--   * Data rows are org-scoped: members of an organization see its rows; the
--     write/delete rights depend on the member's role matrix below.
--   * Legacy rows created before the multi-tenant layer (org_id IS NULL)
--     stay visible only to their original owner.
--   * The service_role key must NEVER appear in the frontend.
-- =============================================================================

-- =============================================================================
-- 1) Data tables — one generic row shape, org-scoped
-- =============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ns_products','ns_partners','ns_invoices','ns_leads','ns_employees',
    'ns_attendance','ns_tasks','ns_ledger','ns_purchase_orders',
    'ns_notifications','ns_stock_moves','ns_shifts','ns_accounts','ns_journals',
    'ns_branches','ns_backups'
  ]
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (
      id text PRIMARY KEY,
      user_id uuid NOT NULL DEFAULT auth.uid(),
      org_id text,
      data jsonb NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now())', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  -- settings are strictly per-user (never org-scoped)
  EXECUTE 'CREATE TABLE IF NOT EXISTS public.ns_settings (
    id text PRIMARY KEY,
    user_id uuid NOT NULL DEFAULT auth.uid(),
    data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now())';
  EXECUTE 'ALTER TABLE public.ns_settings ENABLE ROW LEVEL SECURITY';

  -- idempotency log for composite operations (written only via ns_apply_op)
  EXECUTE 'CREATE TABLE IF NOT EXISTS public.ns_ops (
    id text PRIMARY KEY,
    org_id text,
    user_id uuid,
    created_at timestamptz DEFAULT now())';
  EXECUTE 'ALTER TABLE public.ns_ops ENABLE ROW LEVEL SECURITY';
END $$;
-- 2) Multi-tenant layer — organizations, members, invites
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'ns_orgs') THEN
    CREATE TABLE public.ns_orgs (
      id text PRIMARY KEY,
      name text NOT NULL,
      owner_id uuid NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'ns_members') THEN
    CREATE TABLE public.ns_members (
      id text PRIMARY KEY,
      org_id text NOT NULL REFERENCES public.ns_orgs(id) ON DELETE CASCADE,
      user_id uuid NOT NULL,
      role text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (org_id, user_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'ns_invites') THEN
    CREATE TABLE public.ns_invites (
      id text PRIMARY KEY,
      org_id text NOT NULL,
      code text NOT NULL UNIQUE,
      role text NOT NULL,
      used boolean NOT NULL DEFAULT false,
      expires_at timestamptz,
      created_at timestamptz DEFAULT now());
  END IF;
END $$;
-- ===== migrations for existing databases (all no-op on a fresh install) =====
-- org-layer tables predate updated_at; the ns_touch trigger below needs it
ALTER TABLE public.ns_orgs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.ns_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.ns_invites ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- pre-2.8 data tables lack org_id (upgrade from a single-user install)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ns_products','ns_partners','ns_invoices','ns_leads','ns_employees','ns_attendance','ns_tasks','ns_ledger','ns_purchase_orders','ns_notifications','ns_stock_moves','ns_shifts','ns_accounts','ns_journals','ns_branches','ns_backups']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id text', t);
  END LOOP;
END $$;


-- keep updated_at fresh on every write (PostgREST upserts don't set it)
CREATE OR REPLACE FUNCTION public.ns_touch() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ns_products','ns_partners','ns_invoices','ns_leads','ns_employees',
    'ns_attendance','ns_tasks','ns_ledger','ns_purchase_orders',
    'ns_notifications','ns_stock_moves','ns_shifts','ns_accounts','ns_journals',
    'ns_branches','ns_backups','ns_settings','ns_orgs','ns_members','ns_invites'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS ns_touch ON public.%I', t);
    EXECUTE format('CREATE TRIGGER ns_touch BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.ns_touch()', t);
  END LOOP;
END $$;


-- =============================================================================
ALTER TABLE public.ns_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ns_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ns_invites ENABLE ROW LEVEL SECURITY;

-- RLS helpers (SECURITY DEFINER breaks the policy-recursion cycle: a policy
-- on ns_members must never query ns_members directly)
CREATE OR REPLACE FUNCTION public.ns_my_orgs() RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.ns_members WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.ns_my_orgs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ns_my_orgs() TO authenticated;

CREATE OR REPLACE FUNCTION public.ns_orgs_with_roles(p_roles text[]) RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.ns_members WHERE user_id = auth.uid() AND role = ANY(p_roles)
$$;
REVOKE ALL ON FUNCTION public.ns_orgs_with_roles(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ns_orgs_with_roles(text[]) TO authenticated;

-- organization + membership policies
DROP POLICY IF EXISTS org_select ON public.ns_orgs;
CREATE POLICY org_select ON public.ns_orgs FOR SELECT
  USING (owner_id = auth.uid() OR id IN (SELECT public.ns_my_orgs()));
DROP POLICY IF EXISTS org_insert ON public.ns_orgs;
CREATE POLICY org_insert ON public.ns_orgs FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS org_update ON public.ns_orgs;
CREATE POLICY org_update ON public.ns_orgs FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS mem_select ON public.ns_members;
CREATE POLICY mem_select ON public.ns_members FOR SELECT
  USING (user_id = auth.uid() OR org_id IN (SELECT public.ns_my_orgs()));
DROP POLICY IF EXISTS mem_insert_owner ON public.ns_members;
-- bootstrap only: a user may create their OWN owner membership of an org they own;
-- every other membership is granted exclusively through ns_join_org(code)
CREATE POLICY mem_insert_owner ON public.ns_members FOR INSERT
  WITH CHECK (role = 'owner' AND org_id IN (SELECT id FROM public.ns_orgs WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS mem_update ON public.ns_members;
CREATE POLICY mem_update ON public.ns_members FOR UPDATE
  USING (org_id IN (SELECT id FROM public.ns_orgs WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS mem_delete ON public.ns_members;
CREATE POLICY mem_delete ON public.ns_members FOR DELETE
  USING (org_id IN (SELECT id FROM public.ns_orgs WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS inv_select ON public.ns_invites;
CREATE POLICY inv_select ON public.ns_invites FOR SELECT
  USING (org_id IN (SELECT public.ns_orgs_with_roles(ARRAY['owner','manager'])));
DROP POLICY IF EXISTS inv_insert ON public.ns_invites;
CREATE POLICY inv_insert ON public.ns_invites FOR INSERT
  WITH CHECK (org_id IN (SELECT public.ns_orgs_with_roles(ARRAY['owner','manager'])));
DROP POLICY IF EXISTS inv_update ON public.ns_invites;
CREATE POLICY inv_update ON public.ns_invites FOR UPDATE
  USING (org_id IN (SELECT public.ns_orgs_with_roles(ARRAY['owner','manager'])));
DROP POLICY IF EXISTS inv_delete ON public.ns_invites;
CREATE POLICY inv_delete ON public.ns_invites FOR DELETE
  USING (org_id IN (SELECT public.ns_orgs_with_roles(ARRAY['owner'])));

-- invite redemption — server-validated join (only path to a non-owner membership)
CREATE OR REPLACE FUNCTION public.ns_join_org(p_code text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org text; v_role text; v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT i.org_id, i.role INTO v_org, v_role
    FROM public.ns_invites i
    WHERE i.code = p_code AND i.used = false
      AND (i.expires_at IS NULL OR i.expires_at > now())
    LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'كود الدعوة غير صالح أو منتهي'; END IF;
  IF EXISTS (SELECT 1 FROM public.ns_members WHERE org_id = v_org AND user_id = v_user) THEN
    UPDATE public.ns_invites SET used = true WHERE code = p_code;
    RETURN v_org;
  END IF;
  INSERT INTO public.ns_members (id, org_id, user_id, role)
    VALUES ('mem_' || substr(md5(random()::text), 1, 10), v_org, v_user, v_role);
  UPDATE public.ns_invites SET used = true WHERE code = p_code;
  RETURN v_org;
END $$;
REVOKE ALL ON FUNCTION public.ns_join_org(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ns_join_org(text) TO authenticated;

-- =============================================================================
-- 3) Data-table policies — role matrix
-- =============================================================================
-- SELECT: member of the org (legacy: original owner of an org_id-less row)
-- INSERT/UPDATE: role-dependent write matrix
-- DELETE: senior roles only; posted accounting entries (accounts/journals/
--          ledger) are deletable by the owner alone.
DO $$
DECLARE
  t text; writers text; deleters text;
  tables text[] := ARRAY[
    'ns_products','ns_partners','ns_invoices','ns_leads','ns_employees',
    'ns_attendance','ns_tasks','ns_ledger','ns_purchase_orders',
    'ns_notifications','ns_stock_moves','ns_shifts','ns_accounts','ns_journals',
    'ns_branches'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_select ON public.%I', t);
    EXECUTE format('CREATE POLICY ns_select ON public.%I FOR SELECT USING (
      (org_id IS NULL AND user_id = auth.uid())
      OR org_id IN (SELECT public.ns_my_orgs()))', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['ns_backups'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_select ON public.%I', t);
    EXECUTE format('CREATE POLICY ns_select ON public.%I FOR SELECT USING (
      (org_id IS NULL AND user_id = auth.uid())
      OR org_id IN (SELECT public.ns_my_orgs()))', t);
  END LOOP;

  writers := '{owner,manager,warehouse}'; deleters := '{owner,manager,warehouse}';
  FOREACH t IN ARRAY ARRAY['ns_products'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['ns_partners','ns_invoices'] LOOP
    writers := '{owner,manager,accountant,cashier,sales}'; deleters := '{owner,manager}';
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  writers := '{owner,manager,sales}'; deleters := '{owner,manager}';
  FOREACH t IN ARRAY ARRAY['ns_leads'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  writers := '{owner,manager}'; deleters := '{owner,manager}';
  FOREACH t IN ARRAY ARRAY['ns_employees','ns_attendance','ns_tasks'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  writers := '{owner,manager,accountant}'; deleters := '{owner}';
  FOREACH t IN ARRAY ARRAY['ns_ledger','ns_accounts','ns_journals'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  writers := '{owner,manager,warehouse,accountant}'; deleters := '{owner,manager}';
  FOREACH t IN ARRAY ARRAY['ns_purchase_orders'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  writers := '{owner,manager,cashier,warehouse,sales}'; deleters := '{owner,manager}';
  FOREACH t IN ARRAY ARRAY['ns_notifications','ns_stock_moves'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  writers := '{owner,manager,cashier}'; deleters := '{owner,manager}';
  FOREACH t IN ARRAY ARRAY['ns_shifts'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  writers := '{owner,manager,warehouse}'; deleters := '{owner,manager}';
  FOREACH t IN ARRAY ARRAY['ns_branches'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_update ON public.%I; CREATE POLICY ns_update ON public.%I FOR UPDATE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, writers);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(%L)) OR (org_id IS NULL AND user_id = auth.uid()))', t, t, deleters);
  END LOOP;

  -- snapshots: any member may read; owner/manager may write/delete
  FOREACH t IN ARRAY ARRAY['ns_backups'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS ns_insert ON public.%I; CREATE POLICY ns_insert ON public.%I FOR INSERT WITH CHECK (
      org_id IN (SELECT public.ns_orgs_with_roles(ARRAY[''owner'',''manager''])) OR (org_id IS NULL AND user_id = auth.uid()))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS ns_delete ON public.%I; CREATE POLICY ns_delete ON public.%I FOR DELETE USING (
      org_id IN (SELECT public.ns_orgs_with_roles(ARRAY[''owner'',''manager''])) OR (org_id IS NULL AND user_id = auth.uid()))', t, t);
  END LOOP;

  -- settings: strictly the owner's own row
  EXECUTE 'DROP POLICY IF EXISTS ns_own ON public.ns_settings';
  EXECUTE 'CREATE POLICY ns_own ON public.ns_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
END $$;

-- =============================================================================
-- 4) ns_apply_op — atomic composite operations with idempotency + hardened permissions
-- =============================================================================
-- Applies an operation = { opId, orgId, upserts[], deltas[], deletes[] } in a
-- single transaction:
--   * opId  : idempotency key — a repeated request (e.g. after a lost HTTP
--             response) returns ok without re-applying anything.
--   * deltas: per-branch stock changes, applied against the locked product row
--             (server-side source of truth, no lost updates), rejected when
--             stock is insufficient — the whole operation rolls back cleanly.
--   * upserts/deletes: fixed table allowlist + a per-table role matrix enforced
--             INSIDE this function (it runs as SECURITY DEFINER and bypasses
--             RLS), plus row-ownership checks — an existing id belonging to
--             another org/user can never be overwritten.
-- Business rejections return {ok:false, code, msg}; transport failures raise
-- nothing and are retried safely by the client (idempotency key).

CREATE OR REPLACE FUNCTION public.ns_apply_op(p_op jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_org text := p_op->>'orgId';
  v_opid text := p_op->>'opId';
  v_role text; u jsonb; d jsonb; t text; e jsonb;
  v_id text; v_br text; v_dlt numeric; v_new numeric;
  v_prev jsonb; v_bs jsonb; v_entry jsonb; v_computed jsonb; v_tot numeric;
  v_row_org text; v_row_user uuid; v_req text[];
  pr record;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated'); END IF;
  IF v_opid IS NULL OR v_org IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'bad_request'); END IF;
  IF EXISTS (SELECT 1 FROM public.ns_ops WHERE id = v_opid) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;
  SELECT m.role INTO v_role FROM public.ns_members m WHERE m.org_id = v_org AND m.user_id = v_user;
  IF v_role IS NULL OR v_role NOT IN ('owner','manager','accountant','cashier','warehouse','sales') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden', 'msg', 'ليست لديك صلاحية تنفيذ هذه العملية');
  END IF;

  -- stock deltas: permission = whoever may write stock moves; lock rows, validate, accumulate
  IF jsonb_array_length(COALESCE(p_op->'deltas','[]'::jsonb)) > 0 AND v_role NOT IN ('owner','manager','cashier','warehouse','sales') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden', 'msg', 'دورك لا يسمح بتعديل المخزون');
  END IF;
  v_computed := '{}'::jsonb;
  FOR d IN SELECT * FROM jsonb_array_elements(COALESCE(p_op->'deltas','[]'::jsonb)) LOOP
    v_id := d->>'p'; v_br := d->>'b'; v_dlt := (d->>'d')::numeric;
    IF (v_computed->v_id) IS NULL THEN
      SELECT data INTO v_prev FROM public.ns_products WHERE id = v_id AND (org_id = v_org OR (org_id IS NULL AND user_id = v_user)) FOR UPDATE;
      IF v_prev IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'product_not_found', 'msg', 'منتج غير موجود: ' || v_id); END IF;
      v_bs := COALESCE(v_prev->'branchStock', jsonb_build_object('main', COALESCE(v_prev->'stock', '0'::jsonb)));
      v_computed := v_computed || jsonb_build_object(v_id, jsonb_build_object('prev', v_prev, 'bs', v_bs));
    END IF;
    v_entry := v_computed->v_id;
    v_bs := v_entry->'bs';
    v_new := COALESCE((v_bs->>v_br)::numeric, 0) + v_dlt;
    IF v_new < 0 THEN RETURN jsonb_build_object('ok', false, 'code', 'insufficient_stock', 'msg', 'المخزون غير كافٍ في الفرع (' || COALESCE(v_bs->>v_br, '0') || ' متاح)'); END IF;
    v_computed := v_computed || jsonb_build_object(v_id, jsonb_build_object('prev', v_entry->'prev', 'bs', v_bs || jsonb_build_object(v_br, v_new)));
  END LOOP;

  -- upserts: fixed table allowlist + per-table role matrix + row-ownership check
  FOR u IN SELECT * FROM jsonb_array_elements(COALESCE(p_op->'upserts','[]'::jsonb)) LOOP
    t := u->>'t'; e := u->'e';
    IF e IS NULL OR e->>'id' IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'bad_row'); END IF;
    v_req := CASE t
      WHEN 'ns_products' THEN ARRAY['owner','manager','warehouse']
      WHEN 'ns_partners' THEN ARRAY['owner','manager','accountant','cashier','sales']
      WHEN 'ns_invoices' THEN ARRAY['owner','manager','accountant','cashier','sales']
      WHEN 'ns_stock_moves' THEN ARRAY['owner','manager','cashier','warehouse','sales']
      WHEN 'ns_shifts' THEN ARRAY['owner','manager','cashier']
      WHEN 'ns_ledger' THEN ARRAY['owner','manager','accountant']
      WHEN 'ns_journals' THEN ARRAY['owner','manager','accountant']
      WHEN 'ns_accounts' THEN ARRAY['owner','manager','accountant']
      WHEN 'ns_purchase_orders' THEN ARRAY['owner','manager','warehouse','accountant']
      WHEN 'ns_notifications' THEN ARRAY['owner','manager','accountant','cashier','warehouse','sales']
      WHEN 'ns_branches' THEN ARRAY['owner','manager','warehouse']
      ELSE NULL END;
    IF v_req IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'forbidden_table', 'msg', 'جدول غير مسموح: ' || t); END IF;
    IF NOT (v_role = ANY(v_req)) THEN RETURN jsonb_build_object('ok', false, 'code', 'forbidden_role', 'msg', 'دورك لا يسمح بالكتابة في ' || t); END IF;
    EXECUTE format('SELECT org_id, user_id FROM public.%I WHERE id = $1', t) INTO v_row_org, v_row_user USING e->>'id';
    IF v_row_org IS NOT NULL OR v_row_user IS NOT NULL THEN
      IF v_row_org IS DISTINCT FROM v_org AND v_row_user IS DISTINCT FROM v_user THEN
        RETURN jsonb_build_object('ok', false, 'code', 'forbidden', 'msg', 'الصف لا يتبع شركتك');
      END IF;
    END IF;
    EXECUTE format('INSERT INTO public.%I (id, user_id, org_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4, now(), now()) ON CONFLICT (id) DO UPDATE SET data = $4, updated_at = now()', t)
      USING e->>'id', v_user, v_org, e;
  END LOOP;

  -- deletes: same allowlist + matrix, already scoped to org/legacy ownership
  FOR d IN SELECT * FROM jsonb_array_elements(COALESCE(p_op->'deletes','[]'::jsonb)) LOOP
    t := d->>'t'; v_id := d->>'id';
    v_req := CASE t
      WHEN 'ns_invoices' THEN ARRAY['owner','manager']
      WHEN 'ns_partners' THEN ARRAY['owner','manager']
      WHEN 'ns_stock_moves' THEN ARRAY['owner','manager']
      WHEN 'ns_shifts' THEN ARRAY['owner','manager']
      WHEN 'ns_purchase_orders' THEN ARRAY['owner','manager']
      WHEN 'ns_notifications' THEN ARRAY['owner','manager','accountant','cashier','warehouse','sales']
      WHEN 'ns_branches' THEN ARRAY['owner','manager']
      ELSE NULL END;
    IF v_req IS NULL THEN RETURN jsonb_build_object('ok', false, 'code', 'forbidden_table'); END IF;
    IF NOT (v_role = ANY(v_req)) THEN RETURN jsonb_build_object('ok', false, 'code', 'forbidden_role'); END IF;
    EXECUTE format('DELETE FROM public.%I WHERE id = $1 AND (org_id = $2 OR (org_id IS NULL AND user_id = $3))', t)
      USING v_id, v_org, v_user;
  END LOOP;

  FOR pr IN SELECT * FROM jsonb_each(v_computed) LOOP
    SELECT sum(v::numeric) INTO v_tot FROM jsonb_each_text((pr.value)->'bs') AS x(k, v);
    UPDATE public.ns_products SET
      data = jsonb_set(jsonb_set((pr.value)->'prev', '{branchStock}', (pr.value)->'bs'), '{stock}', to_jsonb(v_tot)),
      updated_at = now()
    WHERE id = pr.key;
  END LOOP;

  INSERT INTO public.ns_ops (id, org_id, user_id, created_at) VALUES (v_opid, v_org, v_user, now());
  DELETE FROM public.ns_ops WHERE created_at < now() - interval '30 days';
  RETURN jsonb_build_object('ok', true);
END $fn$;

REVOKE ALL ON FUNCTION public.ns_apply_op(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ns_apply_op(jsonb) TO authenticated;

-- =============================================================================
-- 5) table grants for the API roles
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
