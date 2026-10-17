/**
 * The content_ir kind-table reader is the package's (@ai-matrx/rich-content
 * kinds/registry/schema-source-kind-tables): one reader for every host, reading through the host's
 * `kindDataClient` (this app passes its browser Supabase client in providers/richContentHost.ts).
 * Re-exported here so this app's importers keep one path.
 */
export * from "@ai-matrx/rich-content/kinds/registry/schema-source-kind-tables";
