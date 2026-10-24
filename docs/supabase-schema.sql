-- Noor Suite — Supabase schema (v2.x)
-- Tables prefixed ns_ to stay isolated from other products sharing the project.
-- RLS: every row is owned by a Supabase auth user; policies enforce auth.uid() = user_id.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ns_products','ns_partners','ns_invoices','ns_leads','ns_employees','ns_attendance','ns_tasks','ns_ledger','ns_notifications','ns_stock_moves','ns_shifts','ns_accounts','ns_journals','ns_backups','ns_settings']
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I (id text PRIMARY KEY, user_id uuid NOT NULL DEFAULT auth.uid(), data jsonb NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS ns_own ON %I', t);
    EXECUTE format('CREATE POLICY ns_own ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;

-- ===== Multi-tenant layer (v2.8.0) =====
-- ns_orgs / ns_members / ns_invites + ns_join_org(code) RPC.
-- Every ns_* data table gained an org_id column. Row visibility:
--   SELECT: legacy own rows (org_id IS NULL AND user_id = auth.uid())
--           OR any row of an org the user is a member of.
--   INSERT/UPDATE: role-gated per table (owner/manager/accountant/
--           cashier/warehouse/sales matrix).
--   DELETE: owner+manager (products also warehouse); journals/accounts/
--           ledger owner only — posted entries are never silently deleted.
-- Invite flow: owner/manager create a code (7 days) -> the employee enters
-- it on the Team page -> ns_join_org RPC validates and inserts membership.

-- The client embeds the PUBLIC anon key only (safe by design thanks to RLS).
-- The service_role key must never be used in the frontend.

-- v2.9.0: cloud snapshots (auto daily, last 7 kept). Insert/trim by owner/manager,
-- readable by every org member, deletes restricted to owner/manager.
-- Conflict detection uses the existing updated_at column: the client compares the
-- server copy's updated_at against its own last local edit per row.
