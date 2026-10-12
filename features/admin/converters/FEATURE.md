# Admin: Converters

`/administration/utilities/converters` — two tabs. Contract and rules:
`common-docs/systems/architecture/converters/FEATURE.md`.

- **All converters** — every registered converter (code and database-defined) from aidream
  `GET /admin/converters`: source format → target, defined in, version + fingerprint, samples, runs,
  last run ("code changed" = the fingerprint moved since that run). Definitions live in server code,
  so this list is read through the server.
- **Database-defined** — `content_ir.converter_definition` rows, read and written straight to
  Supabase (`definitions.ts`). The editor edits name, slug, target, status, item selector, sample
  address and the JSON spec (detect · fields · constants); a change to the mapping bumps
  `converter_version`. "Save and check" saves, then runs aidream
  `POST /admin/converters/definitions/{id}/check` on the sample page and shows the verdict.

Types alias the generated contract (`types.ts`, `definitions.ts`); never hand-mirror them.
