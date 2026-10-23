-- Noor Suite — Supabase schema (v2.x)
-- Tables prefixed ns_ to stay isolated from other products sharing the project.
-- RLS: every row is owned by a Supabase auth user; policies enforce auth.uid() = user_id.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ns_products','ns_partners','ns_invoices','ns_leads','ns_employees','ns_attendance','ns_tasks','ns_ledger','ns_notifications','ns_settings']
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I (id text PRIMARY KEY, user_id uuid NOT NULL DEFAULT auth.uid(), data jsonb NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS ns_own ON %I', t);
    EXECUTE format('CREATE POLICY ns_own ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;

-- The client embeds the PUBLIC anon key only (safe by design thanks to RLS).
-- The service_role key must never be used in the frontend.
