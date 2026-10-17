/**
 * The kind COMPONENT tier lives in @ai-matrx/rich-content (one tier the web and Matrx 2 share, behind
 * registerKindHost; this app's capabilities are wired in providers/richContentHost.ts). This path
 * keeps this app's call sites reading the same.
 */
export * from "@ai-matrx/rich-content/kinds/registry/schema-source-kind-components";
