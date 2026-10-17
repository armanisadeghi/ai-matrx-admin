/**
 * The kind COMPONENT tier lives in @ai-matrx/rich-content (one tier the web and Matrx 2 share, behind
 * registerKindHost; this app's capabilities are wired in providers/richContentHost.ts). This path
 * keeps this app's call sites reading the same.
 *
 * This app's compiled kinds register into the package registry at kind-registry's import; the
 * compiled component floor derives from them, so importing this module registers them first.
 */
import "./kind-registry";
export * from "@ai-matrx/rich-content/kinds/registry/system-components";
