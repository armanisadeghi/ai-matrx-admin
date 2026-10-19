# Media durability check — the DURABILITY MISMATCH guard

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/files/media-durability/FEATURE.md — read it before touching this feature in ANY repo.

What counts as a defect, the safety rule (never publish private content to turn the check green), the health authority and the lessons behind the guard live there. This file holds only how the checker runs and the rules for its files.

`pnpm check:media-durability` is loud, advisory and never blocking.

## How it runs

| Command | Scope | Use |
|---|---|---|
| `pnpm check:media-durability` | contract-scoped (seconds) | release gate; the default |
| `pnpm check:media-durability:full` | every text-ish column in every schema | periodic patrol sweep |
| `pnpm check:media-durability:strict` | contract-scoped | exit 1 on an unclassified hit |

The default scan is **contract-scoped on purpose** — it probes exactly the two populations where the mismatch is definitionally a defect:

1. every column registered in `platform.mtx_public_url_guard`;
2. every text/jsonb column named in `platform.shareable_resource_registry.public_columns` — the projection an anonymous share-link viewer receives.

A blanket sweep of every table takes ~8 minutes and belongs in the patrol, not in every release.

### `--full` coverage is partial, and it says so

`--full` batches **per schema** (`p_schema`) to stay under the PostgREST statement timeout. The biggest schemas (`chat`, `docproc`, `deprecated`, `history`, `public`, `scraper`, `seo`, `web` at last measurement) still time out and are **named in the output** as *not covered*; a patrol that silently skips the biggest tables reads as "all clear". For an authoritative sweep run the scan over a direct Postgres connection (`SUPABASE_MATRIX_*` in `aidream/.env`), which has no statement-timeout ceiling.

Server side: `public.mtx_media_durability_scan(p_full boolean, p_schema text)` and `public.mtx_media_durability_schemas()` (`migrations/mtx_media_durability_scan.sql`).

## The classification is the deliverable

`allowlist.json` is not a silencer list — it is **the classification**, and a wrong verdict in it is the expensive mistake. Every entry names the **consumer** and the **reading code path** that makes expiry correct there. Three buckets:

- **`intentional`** — expiry is right (audit/log/error capture, verbatim third-party data, documentation prose, retired tables). The checker is silent about these.
- **`mitigated`** — stores a non-durable value, but every reading path recovers the `file_id` and re-mints. Reported as open, not healed.
- **`mismatch_open`** — a real mismatch not yet resolved, and why.

**Adding an entry is a judgment, not a way to quiet the checker.** If you cannot name the consumer and say why expiry is fine for it, fix the writer.

## The DB-edge guard files

Register a column with an insert into `platform.mtx_public_url_guard (schema_name, table_name, column_name, note)` plus a trigger:

```sql
create trigger pc_episodes_public_url_guard
  after insert or update on podcast.pc_episodes
  for each row execute function platform.mtx_public_url_guard_trigger();
```

🚨 **The trigger body is MERGED — never re-derive it from one migration.** The array branch and the schema-aware lookup both live in `migrations/mtx_public_url_guard_schema_aware.sql`, which is the file to edit; `public.mtx_media_durability_health()` asserts all four properties out of the LIVE `prosrc` on every `pnpm check:media-durability` run. aidream migration `0333` is the restore and must not be dropped. Both `schema_name` columns (registry and heal queue) are required; there is no wildcard. Do not register intentional-expiry columns.

## Related

- `CLAUDE.md` § "Media durability — public/owned media is NEVER a raw signed URL"
- `lib/media/signed-url.ts` — `isSignedUrl` / `signedUrlExpiresAtMs`, the shared classifier for both AWS dialects (SigV2 and SigV4)
- `lib/media/durability.ts` — `fileIdFromUserFilesUrl`, `reportMediaDurabilityViolation`
- `features/files/handler/hooks/useRemintableSrc.ts` — the read-side self-heal
- `components/mardown-display/blocks/buildMediaSource.ts` — file_id recovery for blocks
- `FOUND_DEFECTS.md` → D1
