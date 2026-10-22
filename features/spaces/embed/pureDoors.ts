// features/spaces/embed/pureDoors.ts — the fence's door for PURE helpers (no React, no store, no "use client"),
// so a server page or a non-Spaces dialog can use them without importing the fence's insides:
//   • isEmbedQuery — the public page's `?embed=` flag (app/(link)/site/[slug]);
//   • countedKind  — "3 tables" / "1 table" wording for the Airtable import report.
export { isEmbedQuery } from "../publish/embed-snippet";
export { countedKind } from "../io/countedKind";
