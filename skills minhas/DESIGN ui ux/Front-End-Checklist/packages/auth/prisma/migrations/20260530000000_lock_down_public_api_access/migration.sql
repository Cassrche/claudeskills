-- Lock down Prisma-owned application tables from Supabase public API roles.
-- The app accesses these tables server-side through Prisma/DATABASE_URL.

ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RuleFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."McpToolCall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RuleProgress" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon, authenticated;
REVOKE ALL ON TABLE public."User" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Session" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Account" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Verification" FROM anon, authenticated;
REVOKE ALL ON TABLE public."UserChecklist" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Audit" FROM anon, authenticated;
REVOKE ALL ON TABLE public."RuleFeedback" FROM anon, authenticated;
REVOKE ALL ON TABLE public."McpToolCall" FROM anon, authenticated;
REVOKE ALL ON TABLE public."RuleProgress" FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

DO $$
DECLARE
  table_oid oid;
  table_name text;
BEGIN
  FOREACH table_oid IN ARRAY ARRAY[
    'public."_prisma_migrations"'::regclass::oid,
    'public."User"'::regclass::oid,
    'public."Session"'::regclass::oid,
    'public."Account"'::regclass::oid,
    'public."Verification"'::regclass::oid,
    'public."UserChecklist"'::regclass::oid,
    'public."Audit"'::regclass::oid,
    'public."RuleFeedback"'::regclass::oid,
    'public."McpToolCall"'::regclass::oid,
    'public."RuleProgress"'::regclass::oid
  ]
  LOOP
    SELECT relname INTO table_name
    FROM pg_class
    WHERE oid = table_oid;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND policyname = 'deny_public_api_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY deny_public_api_access ON %s FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        table_oid::regclass
      );
    END IF;
  END LOOP;
END $$;
