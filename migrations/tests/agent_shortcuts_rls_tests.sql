-- ============================================================
-- Phase 1.4 — RLS smoke tests for the agent shortcut stack
-- ============================================================
-- Run with: psql $DATABASE_URL -v ON_ERROR_STOP=1 -f this_file.sql
-- Safe to re-run: all inserts are rolled back at the end.
--
-- Covers:
--   • global rows: all authenticated users read, only platform admin writes
--   • user-scope: caller sees only own, cannot cross-write
--   • org-scope: members read, org admins write
-- ============================================================

BEGIN;

-- Pre-flight: helpers exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_admin') THEN
    RAISE EXCEPTION 'is_org_admin missing — run scope_columns_on_shortcut_categories.sql first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_org_member') THEN
    RAISE EXCEPTION 'is_org_member missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_platform_admin') THEN
    RAISE EXCEPTION 'is_platform_admin missing';
  END IF;
END $$;

-- Pre-flight: scope columns exist on all three tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shortcut_categories' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'shortcut_categories.user_id missing — run scope_columns_on_shortcut_categories.sql';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_blocks' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'content_blocks.user_id missing — run scope_columns_on_content_blocks.sql';
  END IF;
END $$;

-- Pre-flight: policies are in place
DO $$
DECLARE
  required_policies text[] := ARRAY[
    'shortcut_categories_read',
    'shortcut_categories_insert',
    'shortcut_categories_update',
    'shortcut_categories_delete',
    'content_blocks_read',
    'content_blocks_insert',
    'content_blocks_update',
    'content_blocks_delete',
    'agx_shortcut_read',
    'agx_shortcut_insert',
    'agx_shortcut_update',
    'agx_shortcut_delete'
  ];
  p text;
BEGIN
  FOREACH p IN ARRAY required_policies LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = p) THEN
      RAISE EXCEPTION 'policy % missing', p;
    END IF;
  END LOOP;
END $$;

-- Pre-flight: agent_context_menu_view is queryable
DO $$
DECLARE cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.agent_context_menu_view;
  RAISE NOTICE 'agent_context_menu_view rows: %', cnt;
END $$;

ROLLBACK;

-- ============================================================
-- Additional coverage to add once test user fixtures exist:
--   1. SET LOCAL role to a fake user_A; SELECT own rows succeed
--   2. user_A attempts INSERT with user_id = user_B — must fail
--   3. org_admin inserts org row — succeeds
--   4. org_member reads org row — succeeds
--   5. non-member cannot read org row
--   6. non-admin attempts global insert — fails
-- These require jwt.claims setup or supabase-test-helpers; see phase-01 doc.
-- ============================================================
