# Admin: Converters

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/architecture/converters/FEATURE.md — read it before touching this feature in ANY repo.

Route `/administration/utilities/converters` (page: `app/(admin)/administration/utilities/converters/page.tsx`).
Files: `ConvertersConsole.tsx` (tabs), `DefinitionsPanel.tsx` (editor), `api.ts` (aidream admin calls), `definitions.ts`
(`content_ir.converter_definition` read/write straight to Supabase).

- Types alias the generated contract (`types.ts`, `definitions.ts`); never hand-mirror them.
