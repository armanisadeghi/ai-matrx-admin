# Cloud Files — RLS Recursion Fix (proposal, awaiting approval)

> **Status:** ⚠️ Diagnosed, not yet applied. Awaiting your sign-off before
> running the migration.
> **Severity:** Was blocking ALL browser-side `supabase.from("cld_*")`
> queries. Mitigated on the FE side by routing every upload through the
> Python backend (see `cloudUpload`); this migration is the proper
> permanent fix.
> **Postgres error:** `42P17 — infinite recursion detected in policy for
> relation "cld_file_permissions"`

---

## What's wrong

The current RLS policies on `cld_files`, `cld_folders`, and
`cld_file_permissions` cross-reference each other in a way that triggers
infinite recursion the moment a browser-side query touches any of them.

The cycle:

```
SELECT cld_files
  └─ policy `cld_files_shared_user_select` runs
      └─ EXISTS (SELECT 1 FROM cld_file_permissions ...)
          └─ policy `cld_perms_owner_select` runs
              └─ EXISTS (SELECT 1 FROM cld_files ...)   ← recurses back
              └─ EXISTS (SELECT 1 FROM cld_folders ...) ← also a cycle
```

The same pattern exists for `cld_folders ↔ cld_file_permissions`.

The only reason **anything** works today is that:
1. The `cld_get_user_file_tree` RPC is `SECURITY DEFINER`, so it bypasses
   RLS entirely. That's why tree-loading still works.
2. The Python `/files/*` REST endpoints handle inserts via service-role,
   so writes through the backend don't trigger RLS.

Anything else (any browser code that does `supabase.from("cld_*").select()`
or `.insert()`) hits the recursion error.

---

## How to fix it

The standard Postgres pattern: extract the cross-table existence checks
into `SECURITY DEFINER` helper functions. The function bypasses RLS on
the inner SELECT, so the outer policy doesn't trigger the inner one's
policies — no recursion.

### Migration SQL

```sql
-- ── 1. SECURITY DEFINER helpers ─────────────────────────────────────────

-- "Does the calling user own this file?"
CREATE OR REPLACE FUNCTION public.cld_user_owns_file(p_file_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cld_files
    WHERE id = p_file_id AND owner_id = auth.uid()
  );
$$;

-- "Does the calling user own this folder?"
CREATE OR REPLACE FUNCTION public.cld_user_owns_folder(p_folder_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cld_folders
    WHERE id = p_folder_id AND owner_id = auth.uid()
  );
$$;

-- "Does the calling user have a permission grant on this resource?"
CREATE OR REPLACE FUNCTION public.cld_user_has_permission_grant(
  p_resource_id uuid,
  p_resource_type text,
  p_min_level text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cld_file_permissions p
    LEFT JOIN public.cld_user_group_members gm
      ON p.grantee_type = 'group' AND p.grantee_id = gm.group_id
    WHERE p.resource_id = p_resource_id
      AND p.resource_type = p_resource_type
      AND (p.expires_at IS NULL OR p.expires_at > now())
      AND (
        (p.grantee_type = 'user'  AND p.grantee_id = auth.uid())
        OR
        (p.grantee_type = 'group' AND gm.user_id   = auth.uid())
      )
      AND CASE p_min_level
            WHEN 'read'  THEN true
            WHEN 'write' THEN p.permission_level IN ('write', 'admin')
            WHEN 'admin' THEN p.permission_level = 'admin'
            ELSE false
          END
  );
$$;

-- Lock down EXECUTE — auth.uid() depends on the calling user's JWT.
GRANT EXECUTE ON FUNCTION public.cld_user_owns_file(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cld_user_owns_folder(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cld_user_has_permission_grant(uuid, text, text) TO authenticated;

-- ── 2. Replace the recursive policies on cld_files ──────────────────────

DROP POLICY IF EXISTS cld_files_shared_user_select ON public.cld_files;
CREATE POLICY cld_files_shared_user_select ON public.cld_files
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.cld_user_has_permission_grant(id, 'file', 'read')
  );

DROP POLICY IF EXISTS cld_files_folder_perm_select ON public.cld_files;
CREATE POLICY cld_files_folder_perm_select ON public.cld_files
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND parent_folder_id IS NOT NULL
    AND public.cld_user_has_permission_grant(parent_folder_id, 'folder', 'read')
  );

DROP POLICY IF EXISTS cld_files_shared_user_update ON public.cld_files;
CREATE POLICY cld_files_shared_user_update ON public.cld_files
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.cld_user_has_permission_grant(id, 'file', 'write')
  );

-- ── 3. Replace the recursive policies on cld_folders ────────────────────

DROP POLICY IF EXISTS cld_folders_shared_user_select ON public.cld_folders;
CREATE POLICY cld_folders_shared_user_select ON public.cld_folders
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.cld_user_has_permission_grant(id, 'folder', 'read')
  );

-- ── 4. Replace the recursive policies on cld_file_permissions ───────────

DROP POLICY IF EXISTS cld_perms_owner_select ON public.cld_file_permissions;
CREATE POLICY cld_perms_owner_select ON public.cld_file_permissions
  FOR SELECT
  USING (
    (resource_type = 'file'   AND public.cld_user_owns_file(resource_id))
    OR
    (resource_type = 'folder' AND public.cld_user_owns_folder(resource_id))
    OR
    (grantee_id = auth.uid() AND grantee_type = 'user')
  );

DROP POLICY IF EXISTS cld_perms_owner_insert ON public.cld_file_permissions;
CREATE POLICY cld_perms_owner_insert ON public.cld_file_permissions
  FOR INSERT
  WITH CHECK (
    (resource_type = 'file'   AND public.cld_user_owns_file(resource_id))
    OR
    (resource_type = 'folder' AND public.cld_user_owns_folder(resource_id))
  );

DROP POLICY IF EXISTS cld_perms_owner_delete ON public.cld_file_permissions;
CREATE POLICY cld_perms_owner_delete ON public.cld_file_permissions
  FOR DELETE
  USING (
    (resource_type = 'file'   AND public.cld_user_owns_file(resource_id))
    OR
    (resource_type = 'folder' AND public.cld_user_owns_folder(resource_id))
  );

-- ── 5. cld_share_links — same pattern ───────────────────────────────────

DROP POLICY IF EXISTS cld_shares_owner_all ON public.cld_share_links;
CREATE POLICY cld_shares_owner_all ON public.cld_share_links
  FOR ALL
  USING (
    (resource_type = 'file'   AND public.cld_user_owns_file(resource_id))
    OR
    (resource_type = 'folder' AND public.cld_user_owns_folder(resource_id))
  )
  WITH CHECK (
    (resource_type = 'file'   AND public.cld_user_owns_file(resource_id))
    OR
    (resource_type = 'folder' AND public.cld_user_owns_folder(resource_id))
  );
```

### What it does, in plain English

- **`cld_user_owns_file(id)`** / **`cld_user_owns_folder(id)`**: a single
  RLS-bypassing read against the table to answer "does the caller own
  this row?". Used in lots of policies; one helper, one cycle break.
- **`cld_user_has_permission_grant(resource, type, min_level)`**: same
  for the share-grants table; combines the user-grant and group-grant
  lookups and gates by minimum permission level (`read` / `write` /
  `admin`).
- The policies themselves stay semantically identical — same access
  rules, same outcomes for users — but the EXISTS subqueries no longer
  trigger another round of RLS evaluation.

### Behavior after migration

| Caller | Before | After |
|---|---|---|
| Browser `supabase.from("cld_files").select()` | 42P17 recursion | Works |
| Browser `supabase.from("cld_folders").insert()` | 42P17 | Works |
| Browser `useFileUploadWithStorage` | "Upload failed" | Works |
| Browser `useUploadAndGet` | "Upload failed" | Works |
| Server `Api.Server.uploadAndShare` | Already worked | Still works |
| `/api/images/upload` | Already worked | Still works |
| Realtime subscriptions | Already worked | Still works |

---

## How to apply

1. **Review the SQL above and approve.**
2. I'll run it via `mcp__supabase__apply_migration` against the
   `automation-matrix` project (id `txzxabzwovsujtloxrus`).
3. Test by running the patterns at `/ssr/demos/file-upload-debug` —
   every row should show ✓ instead of "Code: 42P17".
4. Once verified, the FE can OPTIONALLY restore the supabase-js direct
   reads in `ensureFolderPath` etc. — but we shouldn't, because the
   single-source `cloudUpload` design is cleaner regardless.

---

## Why we ALSO did the FE-side fix

Even after this migration lands, having one single upload primitive
(`cloudUpload`) is better than 6 different paths. The Python backend
already handles folder creation atomically; bouncing the browser
through `ensureFolderPath` is unnecessary work AND a second source of
truth that could drift. The architectural fix (single primitive)
remains the right answer regardless of whether the SQL fix happens.

The SQL fix matters for **OTHER** browser code that reads from `cld_*`
tables — file detail dialogs, version lists, etc. Those need direct
supabase-js reads (RLS enforcement is the whole point) and they're
hitting the same recursion. Without this migration, that code keeps
silently falling back to error messages or empty states.
