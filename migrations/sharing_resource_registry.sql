-- ============================================================================
-- Shareable Resource Registry — single source of truth for sharing
-- ============================================================================
--
-- Why this exists
-- ---------------
-- Before this migration, every share-related RPC carried its own hardcoded
-- CASE statement mapping resource_type aliases to table names:
--
--     share_resource_with_user        : prompt→prompts, workflow→workflows, ...
--     share_resource_with_org         : prompt→prompts, note→notes (only)
--     update_permission_level         : prompt→prompts, note→notes (only)
--     make_resource_public/private    : (no mapping at all)
--     revoke_resource_access          : (no mapping at all)
--     revoke_resource_org_access      : (no mapping at all)
--     is_resource_owner               : (no mapping at all)
--
-- The TypeScript layer carried yet another, different mapping in
-- utils/permissions/service.ts::getTableName(). Adding a new shareable
-- resource therefore meant editing 7+ unrelated places, and every drift
-- failed silently — except when it failed loudly at runtime, which is
-- how the "Unknown resource type: agent" bug surfaced (the TS layer mapped
-- agent→agx_agent, the RPC layer did not).
--
-- This migration replaces all of that with one platform primitive:
--
--   1. shareable_resource_registry     — one row per shareable type.
--   2. resolve_shareable_resource(...) — single resolver every RPC must use.
--   3. permissions_resource_type_check — trigger that rejects writes whose
--                                        resource_type isn't a registered
--                                        canonical table name.
--
-- Adding a new shareable resource is now exactly:
--   INSERT INTO shareable_resource_registry (...)  -- one row, one place
--
-- The TypeScript layer reads the registry (or mirrors it via a generated
-- file + a forcing-function test). No new RPC, no new CASE statement, no
-- new ad-hoc URL map.
--
-- ----------------------------------------------------------------------------
-- Storage convention
-- ----------------------------------------------------------------------------
-- `permissions.resource_type` ALWAYS stores the canonical Postgres TABLE NAME
-- (e.g. 'agx_agent', 'cx_conversation', 'prompts'). All RLS policies already
-- use the table name. The registry provides the alias→table_name translation
-- for the public API surface (TS / RPC arguments) so the wire format can stay
-- friendly ('agent', 'prompt') while the storage stays canonical.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The registry table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shareable_resource_registry (
  -- Public alias used by the UI / API / RPC arguments. Frequently equals the
  -- table name itself; for legacy types it's the singular form ('prompt').
  resource_type        text PRIMARY KEY,

  -- The canonical Postgres table name. ALL writes to permissions.resource_type
  -- store this value (never the alias).
  table_name           text NOT NULL,

  -- Primary key column on the resource table. Almost always 'id'; flashcard_sets
  -- uses 'set_id'. Surfaced here so the resolver can build correct dynamic SQL.
  id_column            text NOT NULL DEFAULT 'id',

  -- Column on the resource table that holds the owner's auth.uid().
  owner_column         text NOT NULL DEFAULT 'user_id',

  -- Optional column on the resource table that holds the public-visibility
  -- boolean. Most tables use 'is_public', a few use 'public'. NULL when the
  -- table has no public flag (visibility is private-only or controlled by a
  -- different mechanism).
  is_public_column     text,

  -- Human-readable label for the share modal title and emails. Replaces the
  -- TS-only getResourceTypeLabel() map.
  display_label        text NOT NULL,

  -- URL pattern for the share link. {id} is substituted with resource_id.
  -- Replaces the inline resourcePaths map in ShareModal.getShareUrl().
  url_path_template    text NOT NULL,

  -- Whether the resource table's RLS actually calls has_permission() —
  -- if FALSE, sharing rows can be inserted but RLS won't grant the grantee
  -- access. Surfaces a known-broken state explicitly so it can't hide.
  rls_uses_has_permission boolean NOT NULL DEFAULT true,

  -- Soft-disable a type without deleting the row.
  is_active            boolean NOT NULL DEFAULT true,

  -- Free-form notes (e.g. "blocked: needs RLS migration").
  notes                text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shareable_resource_registry_table_name_unique UNIQUE (table_name)
);

COMMENT ON TABLE  public.shareable_resource_registry IS
  'Single source of truth for shareable resource types. Adding a new shareable resource = INSERT one row here. See features/sharing/FEATURE.md.';
COMMENT ON COLUMN public.shareable_resource_registry.resource_type IS
  'Public alias used in RPC arguments and UI props (e.g. agent). Translated to table_name internally.';
COMMENT ON COLUMN public.shareable_resource_registry.table_name IS
  'Canonical Postgres table name. ALL permissions.resource_type rows store this value.';
COMMENT ON COLUMN public.shareable_resource_registry.rls_uses_has_permission IS
  'When false, the table''s RLS does NOT call has_permission() — granting a permission row will not actually let the grantee see the resource. Surfaces broken end-to-end states explicitly.';

-- updated_at trigger
CREATE OR REPLACE FUNCTION public._shareable_resource_registry_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shareable_resource_registry_touch ON public.shareable_resource_registry;
CREATE TRIGGER shareable_resource_registry_touch
  BEFORE UPDATE ON public.shareable_resource_registry
  FOR EACH ROW EXECUTE FUNCTION public._shareable_resource_registry_touch();

-- Read access for everyone (so the FE can mirror the registry without RLS gymnastics).
ALTER TABLE public.shareable_resource_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shareable_resource_registry_select ON public.shareable_resource_registry;
CREATE POLICY shareable_resource_registry_select
  ON public.shareable_resource_registry
  FOR SELECT
  USING (true);
-- Writes are intentionally restricted to service_role / migrations only — no INSERT/UPDATE/DELETE policies.

-- ---------------------------------------------------------------------------
-- 2. Seed the registry
-- ---------------------------------------------------------------------------
-- Only types whose tables actually exist with the required columns are seeded.
-- Types in the FE union that point at non-existent tables (tasks, recipes,
-- workflows, applets, conversations, messages, documents) are intentionally
-- omitted — they were silently broken before this migration and need their
-- own follow-up.
--
-- rls_uses_has_permission reflects whether the table's SELECT/UPDATE policies
-- actually call has_permission(). For tables where this is FALSE, sharing
-- rows insert successfully but RLS will not grant the grantee access — these
-- are tracked in the 'rls-rollout' follow-up.
--
INSERT INTO public.shareable_resource_registry (
  resource_type, table_name, id_column, owner_column, is_public_column,
  display_label, url_path_template, rls_uses_has_permission, notes
) VALUES
  -- Active alias-style types (TS sends alias, registry maps to table)
  ('agent',              'agx_agent',         'id', 'user_id', 'is_public', 'Agent',         '/agents/{id}/edit',          false, 'agx_agent RLS does not yet call has_permission(). Sharing row inserts succeed; grantee will not see the agent until RLS migration. Tracked in rls-rollout.'),
  ('prompt',             'prompts',           'id', 'user_id', 'is_public', 'Prompt',        '/ai/prompts/edit/{id}',      false, 'prompts RLS uses user_id + organization scope. Add OR has_permission() to enable sharing end-to-end.'),
  ('note',               'notes',             'id', 'user_id', 'is_public', 'Note',          '/notes/{id}',                false, 'notes RLS uses user_id + organization scope. Add OR has_permission() to enable sharing end-to-end.'),

  -- Active table-name-style types (TS sends table_name as-is)
  ('cx_conversation',    'cx_conversation',   'id', 'user_id', 'is_public', 'Conversation',  '/chat/{id}',                 true,  null),
  ('canvas_items',       'canvas_items',      'id', 'user_id', 'is_public', 'Canvas',        '/canvas/{id}',               true,  null),
  ('user_tables',        'user_tables',       'id', 'user_id', 'is_public', 'Table',         '/tables/{id}',               true,  null),
  ('user_lists',         'user_lists',        'id', 'user_id', 'is_public', 'List',          '/lists/{id}',                true,  null),
  ('transcripts',        'transcripts',       'id', 'user_id', 'is_public', 'Transcript',    '/transcripts/{id}',          true,  null),
  ('quiz_sessions',      'quiz_sessions',     'id', 'user_id', null,        'Quiz',          '/quizzes/{id}',              true,  null),
  ('sandbox_instances',  'sandbox_instances', 'id', 'user_id', null,        'Sandbox',       '/sandbox/{id}',              true,  null),
  ('user_files',         'user_files',        'id', 'user_id', null,        'File',          '/files/{id}',                true,  null),
  ('prompt_actions',     'prompt_actions',    'id', 'user_id', 'is_public', 'Action',        '/ai/prompts/actions/{id}',   true,  null),
  ('flashcard_data',     'flashcard_data',    'id', 'user_id', 'public',    'Flashcard',     '/flashcards/{id}',           true,  'flashcard_data uses column "public" instead of "is_public".')
ON CONFLICT (resource_type) DO UPDATE SET
  table_name = EXCLUDED.table_name,
  id_column = EXCLUDED.id_column,
  owner_column = EXCLUDED.owner_column,
  is_public_column = EXCLUDED.is_public_column,
  display_label = EXCLUDED.display_label,
  url_path_template = EXCLUDED.url_path_template,
  rls_uses_has_permission = EXCLUDED.rls_uses_has_permission,
  notes = EXCLUDED.notes,
  is_active = true;

-- flashcard_sets is intentionally NOT seeded by this migration:
--   - id column is set_id (registry supports that), BUT
--   - is_resource_owner() looks up tables that have BOTH an 'id' AND 'user_id'
--     column. flashcard_sets has set_id+user_id, no id.
-- Seeding it would let writes into permissions but every share/revoke RPC
-- would fail at the ownership check. It is left out until is_resource_owner
-- is updated to use the registry's id_column.
--
-- TODO(rls-rollout): seed flashcard_sets once is_resource_owner uses id_column.

-- ---------------------------------------------------------------------------
-- 3. The single resolver every RPC must consult
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.resolve_shareable_resource(text);

CREATE OR REPLACE FUNCTION public.resolve_shareable_resource(p_resource_type text)
RETURNS TABLE(
  resource_type     text,
  table_name        text,
  id_column         text,
  owner_column      text,
  is_public_column  text,
  display_label     text,
  url_path_template text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Accept either the public alias OR the canonical table_name; both must
  -- resolve to a single registry row.
  RETURN QUERY
  SELECT
    r.resource_type,
    r.table_name,
    r.id_column,
    r.owner_column,
    r.is_public_column,
    r.display_label,
    r.url_path_template
  FROM public.shareable_resource_registry r
  WHERE r.is_active = true
    AND (r.resource_type = p_resource_type OR r.table_name = p_resource_type)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown shareable resource type: %. Register it in shareable_resource_registry. See features/sharing/FEATURE.md.', p_resource_type
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.resolve_shareable_resource(text) IS
  'Single resolver for shareable resource types. Every share/revoke/visibility RPC consults this — never hardcode CASE statements.';

GRANT EXECUTE ON FUNCTION public.resolve_shareable_resource(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Refactor every share-related RPC to use the resolver
-- ---------------------------------------------------------------------------

-- 4.1 is_resource_owner — accepts alias OR table_name; uses registry to find
-- the actual table + id_column + owner_column.
CREATE OR REPLACE FUNCTION public.is_resource_owner(
  p_resource_type text,
  p_resource_id   uuid
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_resolved      record;
  v_owner_id      uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved
    FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  EXECUTE format(
    'SELECT %I FROM %I WHERE %I = $1',
    v_resolved.owner_column,
    v_resolved.table_name,
    v_resolved.id_column
  ) INTO v_owner_id USING p_resource_id;

  RETURN v_owner_id IS NOT NULL AND v_owner_id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_resource_owner(text, uuid) TO authenticated, service_role;

-- 4.2 share_resource_with_user — alias-aware, resolver-driven.
-- Stores the canonical table_name in permissions.resource_type.
CREATE OR REPLACE FUNCTION public.share_resource_with_user(
  p_resource_type     text,
  p_resource_id       uuid,
  p_target_user_id    uuid,
  p_permission_level  text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_resolved     record;
  v_owner_id     uuid;
  v_new_id       uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_permission_level NOT IN ('viewer', 'editor', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level');
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  EXECUTE format(
    'SELECT %I FROM %I WHERE %I = $1',
    v_resolved.owner_column, v_resolved.table_name, v_resolved.id_column
  ) INTO v_owner_id USING p_resource_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource not found');
  END IF;
  IF v_owner_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this resource');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.permissions
    WHERE resource_type = v_resolved.table_name
      AND resource_id   = p_resource_id
      AND granted_to_user_id = p_target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This user already has access to this resource');
  END IF;

  INSERT INTO public.permissions (
    resource_type, resource_id, granted_to_user_id, permission_level, created_by
  ) VALUES (
    v_resolved.table_name, p_resource_id, p_target_user_id,
    p_permission_level::permission_level, v_uid
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully shared with user',
    'permission_id', v_new_id,
    'resource_type', v_resolved.table_name
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4.3 share_resource_with_org — same pattern.
CREATE OR REPLACE FUNCTION public.share_resource_with_org(
  p_resource_type    text,
  p_resource_id      uuid,
  p_target_org_id    uuid,
  p_permission_level text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_resolved  record;
  v_owner_id  uuid;
  v_new_id    uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_permission_level NOT IN ('viewer', 'editor', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level');
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  EXECUTE format(
    'SELECT %I FROM %I WHERE %I = $1',
    v_resolved.owner_column, v_resolved.table_name, v_resolved.id_column
  ) INTO v_owner_id USING p_resource_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resource not found');
  END IF;
  IF v_owner_id <> v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this resource');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_target_org_id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found or you are not a member');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.permissions
    WHERE resource_type = v_resolved.table_name
      AND resource_id   = p_resource_id
      AND granted_to_organization_id = p_target_org_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization already has access');
  END IF;

  INSERT INTO public.permissions (
    resource_type, resource_id, granted_to_organization_id, permission_level, created_by
  ) VALUES (
    v_resolved.table_name, p_resource_id, p_target_org_id,
    p_permission_level::permission_level, v_uid
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Shared with organization',
    'permission_id', v_new_id,
    'resource_type', v_resolved.table_name
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4.4 update_permission_level
CREATE OR REPLACE FUNCTION public.update_permission_level(
  p_resource_type   text,
  p_resource_id     uuid,
  p_target_user_id  uuid DEFAULT NULL,
  p_target_org_id   uuid DEFAULT NULL,
  p_new_level       text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_resolved  record;
  v_updated   int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_new_level NOT IN ('viewer', 'editor', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid permission level');
  END IF;
  IF p_target_user_id IS NULL AND p_target_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must specify target user or organization');
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  IF NOT public.is_resource_owner(v_resolved.table_name, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this resource');
  END IF;

  UPDATE public.permissions
     SET permission_level = p_new_level::permission_level
   WHERE resource_type = v_resolved.table_name
     AND resource_id   = p_resource_id
     AND (
       (p_target_user_id IS NOT NULL AND granted_to_user_id = p_target_user_id)
       OR
       (p_target_org_id  IS NOT NULL AND granted_to_organization_id = p_target_org_id)
     );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching permission found');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Permission level updated to ' || p_new_level);
END;
$$;

-- 4.5 revoke_resource_access (user)
CREATE OR REPLACE FUNCTION public.revoke_resource_access(
  p_resource_type   text,
  p_resource_id     uuid,
  p_target_user_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_resolved  record;
  v_deleted   int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  IF NOT public.is_resource_owner(v_resolved.table_name, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can revoke access');
  END IF;

  DELETE FROM public.permissions
   WHERE resource_type = v_resolved.table_name
     AND resource_id   = p_resource_id
     AND granted_to_user_id = p_target_user_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching permission found');
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'Access revoked');
END;
$$;

-- 4.6 revoke_resource_org_access
CREATE OR REPLACE FUNCTION public.revoke_resource_org_access(
  p_resource_type  text,
  p_resource_id    uuid,
  p_target_org_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_resolved  record;
  v_deleted   int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  IF NOT public.is_resource_owner(v_resolved.table_name, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can revoke access');
  END IF;

  DELETE FROM public.permissions
   WHERE resource_type = v_resolved.table_name
     AND resource_id   = p_resource_id
     AND granted_to_organization_id = p_target_org_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching organization permission found');
  END IF;
  RETURN jsonb_build_object('success', true, 'message', 'Organization access revoked');
END;
$$;

-- 4.7 make_resource_public — uses registry's is_public_column.
CREATE OR REPLACE FUNCTION public.make_resource_public(
  p_resource_type text,
  p_resource_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_resolved  record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  IF v_resolved.is_public_column IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', format('Resource %s does not support public visibility', v_resolved.resource_type));
  END IF;

  IF NOT public.is_resource_owner(v_resolved.table_name, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can change visibility');
  END IF;

  EXECUTE format(
    'UPDATE %I SET %I = true WHERE %I = $1',
    v_resolved.table_name, v_resolved.is_public_column, v_resolved.id_column
  ) USING p_resource_id;

  RETURN jsonb_build_object('success', true,
    'message', v_resolved.display_label || ' is now public');
END;
$$;

-- 4.8 make_resource_private
CREATE OR REPLACE FUNCTION public.make_resource_private(
  p_resource_type text,
  p_resource_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_resolved  record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  IF v_resolved.is_public_column IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', format('Resource %s does not support public visibility', v_resolved.resource_type));
  END IF;

  IF NOT public.is_resource_owner(v_resolved.table_name, p_resource_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can change visibility');
  END IF;

  EXECUTE format(
    'UPDATE %I SET %I = false WHERE %I = $1',
    v_resolved.table_name, v_resolved.is_public_column, v_resolved.id_column
  ) USING p_resource_id;

  RETURN jsonb_build_object('success', true,
    'message', v_resolved.display_label || ' is now private');
END;
$$;

-- 4.9 get_resource_permissions — accepts alias, normalizes to canonical.
CREATE OR REPLACE FUNCTION public.get_resource_permissions(
  p_resource_type text,
  p_resource_id   uuid
)
RETURNS TABLE(
  id uuid,
  resource_type text,
  resource_id uuid,
  granted_to_user_id uuid,
  granted_to_organization_id uuid,
  is_public boolean,
  permission_level text,
  created_at timestamptz,
  granted_to_user jsonb,
  granted_to_organization jsonb
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_resolved record;
BEGIN
  BEGIN
    SELECT * INTO STRICT v_resolved FROM public.resolve_shareable_resource(p_resource_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN; -- unknown type → empty result, same as non-owner
  END;

  IF NOT public.is_resource_owner(v_resolved.table_name, p_resource_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    perm.id,
    perm.resource_type::text,
    perm.resource_id,
    perm.granted_to_user_id,
    perm.granted_to_organization_id,
    perm.is_public,
    perm.permission_level::text,
    perm.created_at,
    CASE WHEN perm.granted_to_user_id IS NOT NULL THEN
      jsonb_build_object(
        'id', u.id::text,
        'email', u.email,
        'displayName', COALESCE(
          u.raw_user_meta_data->>'display_name',
          u.raw_user_meta_data->>'full_name',
          split_part(u.email, '@', 1)
        )
      )
    END AS granted_to_user,
    CASE WHEN perm.granted_to_organization_id IS NOT NULL THEN
      jsonb_build_object(
        'id', o.id::text,
        'name', COALESCE(o.name, 'Unknown Organization'),
        'slug', COALESCE(o.slug, 'unknown'),
        'logoUrl', o.logo_url
      )
    END AS granted_to_organization
  FROM public.permissions perm
  LEFT JOIN auth.users    u ON u.id = perm.granted_to_user_id
  LEFT JOIN public.organizations o ON o.id = perm.granted_to_organization_id
  WHERE perm.resource_type = v_resolved.table_name
    AND perm.resource_id   = p_resource_id
  ORDER BY perm.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_resource_with_user(text, uuid, uuid, text)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.share_resource_with_org (text, uuid, uuid, text)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_permission_level (text, uuid, uuid, uuid, text)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_resource_access  (text, uuid, uuid)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_resource_org_access(text, uuid, uuid)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.make_resource_public    (text, uuid)                    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.make_resource_private   (text, uuid)                    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_resource_permissions(text, uuid)                    TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Backfill: any permissions row whose resource_type is an alias gets
--    rewritten to its canonical table_name.
-- ---------------------------------------------------------------------------
UPDATE public.permissions p
   SET resource_type = r.table_name
  FROM public.shareable_resource_registry r
 WHERE p.resource_type = r.resource_type
   AND p.resource_type <> r.table_name;

-- ---------------------------------------------------------------------------
-- 6. Trigger: reject any permissions row whose resource_type isn't a
--    registered canonical table_name. This is the loud-failure boundary.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.permissions_validate_resource_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.shareable_resource_registry r
    WHERE r.is_active = true AND r.table_name = NEW.resource_type
  ) THEN
    RAISE EXCEPTION 'permissions.resource_type=% is not registered. Insert a row into shareable_resource_registry first. See features/sharing/FEATURE.md.', NEW.resource_type
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS permissions_validate_resource_type_ins ON public.permissions;
DROP TRIGGER IF EXISTS permissions_validate_resource_type_upd ON public.permissions;

CREATE TRIGGER permissions_validate_resource_type_ins
  BEFORE INSERT ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.permissions_validate_resource_type();

CREATE TRIGGER permissions_validate_resource_type_upd
  BEFORE UPDATE OF resource_type ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.permissions_validate_resource_type();

COMMIT;

-- ============================================================================
-- Adding a new shareable resource (the new pattern)
-- ============================================================================
-- 1. Make sure the resource table has user_id + id (or set_id) + (optionally)
--    is_public columns.
-- 2. INSERT INTO public.shareable_resource_registry (resource_type, table_name,
--    id_column, owner_column, is_public_column, display_label,
--    url_path_template, rls_uses_has_permission)
--    VALUES (...);
-- 3. Add the resource_type to the TS ResourceType union (mirror of the registry).
-- 4. (If RLS doesn't already call has_permission for this table) — add the
--    OR has_permission(table_name, id, level) clause to its RLS policies and
--    set rls_uses_has_permission=true. Until then, set it to false so the
--    broken-end-to-end state is visible in the registry.
--
-- Drop ShareButton in. That is the entire integration.
-- ============================================================================
