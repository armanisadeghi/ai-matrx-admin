# visual-map-lab — the owner's lab for rendered diagrams

Pages (domain tree: content → visual-maps; kind workspace, registered in `features/shell/constants/feature-pages.ts`):
`/visual-maps/lab` (front door, redirects signed-in people) · `/visual-maps/lab/all` (the list) · `/visual-maps/lab/[sampleId]` (one sample).
Surface: `matrx-user/visual-map-lab` (`features/surfaces/manifests/visual-map-lab.manifest.ts`).

**Samples** (id = the record address): `subject:S3:archify-sonnet` (the six 2026-10-19 test subjects; spec, Mermaid source and agent
report are embedded in `subjects.data.ts`, the large engine outputs are read by platform file id; index file
`7634d379-8a3f-4c65-8c88-eced5801b77e`), `workflow:<definition id>` (`GET /workflows/{id}/overview`, read when opened),
`inspection:<render_inspection row id>` (content_ir.render_inspection grouped by subject; row security decides who sees what).

**Reused, never forked:** `VisualMap` (rich-content) draws the picture; `MermaidRenderer` + `measure()` (`@ai-matrx/diagrams/measure`)
draw and measure the Mermaid version; `inspect` / `inspectionForAI` / `copyInspectionPackage` (`@ai-matrx/alchemy/operate/inspect`) are
Inspect again and Copy for AI; `createAgentSampleDetailed` + `fileRefPart` (`features/agents/samples`) are Send to agent builder;
`EntityListPage` + `createMemoryListService` are the list.

**Send to agent builder:** `agentMapping.ts` maps sample values onto the agent's declared variables by name; the person edits the
mapping; everything no variable takes is listed ("Not sent"), never dropped. The screenshot is the stored one, else the fresh one, uploaded as a file.
Regenerating `subjects.data.ts`: re-export from `aidream/apps/shared/diagrams/test/fixtures/subjects` (files.json + spec.json + diagram.mmd).
