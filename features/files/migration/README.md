# Cloud Files Migration — Rules of the Road

Modeled on [features/agents/migration/README.md](../../agents/migration/README.md). Read this before editing anything under `features/files/`, `app/(a)/cloud-files/`, `app/(public)/share/`, or any legacy file surface listed in [INVENTORY.md](INVENTORY.md).

---

## Top-level rules (non-negotiable)

1. **No destructive action until the replacement ships and its phase is `complete`.** Legacy components stay wired up until every consumer has migrated. Deletion happens in Phase 11 only.

2. **Always update [INVENTORY.md](INVENTORY.md) in the same PR as the code change.** Any new legacy surface discovered during the migration → add a row. Any consumer migrated → flip `legacy` → `replaced`. Any component deleted → flip `replaced` → `deleted`.

3. **Always update [../FEATURE.md](../FEATURE.md) for any architectural change.** Treat docs as code; same review weight.

4. **One migration, one PR.** Do not bundle two legacy-surface migrations in one PR. Small PRs make rollback easy.

5. **Never touch the Python team's doc** ([cloud_files_frontend.md](../cloud_files_frontend.md)). If you disagree with something in it, log a question in [../PYTHON_TEAM_COMMS.md](../PYTHON_TEAM_COMMS.md).

---

## How to add a new file-related feature

If you want to add a file-related feature to the app (say, "attach file to a comment"), do NOT build it against the legacy system.

1. Read [../SKILL.md](../SKILL.md) for the consumption patterns.
2. Check [INVENTORY.md](INVENTORY.md) — is the surface you're extending already migrated?
   - **Yes** → wire into the new `features/files/` hooks/components.
   - **No** → migrate the surface first in its own PR, then add your feature.
3. If you discover a gap in `features/files/` (missing hook, missing action), extend `features/files/` rather than working around it. Add a row to [MASTER-PLAN.md](MASTER-PLAN.md) if the gap is substantial.

---

## How to migrate a legacy consumer

Walk every row in [INVENTORY.md](INVENTORY.md) with `status: legacy`. For each one:

1. Grep callers: `grep -r "import.*from.*<legacy path>"`
2. For each caller:
   - Replace the import with the new `features/files/` equivalent.
   - Replace the API calls (upload, download, signed URL, etc.) with the new thunks/hooks.
   - Update types — remove any local `File*` or `Bucket*` types; import from [../types.ts](../types.ts).
   - Verify in the browser.
3. When every caller is migrated:
   - Remove the legacy export.
   - Flip the INVENTORY row to `replaced`.
   - Open the deletion in Phase 11 (not now).

---

## How to talk to the Python team

Log the interaction in [../PYTHON_TEAM_COMMS.md](../PYTHON_TEAM_COMMS.md). Date, status, context, ask, workaround. If the answer changes our behavior, reflect it in [../FEATURE.md](../FEATURE.md).

Do not DM the Python team about architecture questions that aren't already in `PYTHON_TEAM_COMMS.md` — log first so there's a record future agents can find.

---

## How to review a files PR

Ask:

1. **Is the slice the source of truth?** Any local `useState` for file data is a red flag.
2. **Is `requestId` attached to every REST write?** Grep the PR diff for `X-Request-Id`. Missing = realtime flicker.
3. **Are docs updated?** [INVENTORY.md](INVENTORY.md) row changes, [../FEATURE.md](../FEATURE.md) change-log entry.
4. **Did they add inline types?** Types must be in [../types.ts](../types.ts).
5. **Mobile?** Dialog on mobile = instant rejection. Must branch via `useIsMobile()` to Drawer.
6. **Route?** Routes under `app/(a)/cloud-files/` must follow the `(a)` rules skills.
7. **Deletion?** If the PR removes a legacy file, does the INVENTORY row say `replaced` (not `legacy`)? If not, block.

---

## When to escalate

Escalate to Arman before:

- Touching any file under `app/(authenticated)/files/` outside a pure deletion in Phase 11.
- Adding a new Redux slice anywhere in the app that references file data. (Extend `cloudFiles` instead.)
- Adding a new `supabase.storage.*` call anywhere — even in "temporary" or "legacy" code. This is the thing we're getting rid of.
- Deviating from the non-negotiables in [../FEATURE.md](../FEATURE.md). If you think an invariant should change, propose it in a PR that updates FEATURE.md first, with a rationale, before touching code.
