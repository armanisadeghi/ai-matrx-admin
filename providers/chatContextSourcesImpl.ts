// providers/chatContextSourcesImpl.ts
//
// The ONE implementation module behind chatContextSources' lazily-loaded component slots
// (THE FRAGMENTATION LAW: one async edge for the registry). chatContextSources is reached from
// the root <Providers> through ChatHostAdapter, so a static import here shipped in every
// route's first load — SandboxDiagnosticsPanel was the last gateway pulling the design-system
// data-table root (~1 MB) onto every page (2026-10-13 first-load campaign). Both components
// render only when a person opens a sandbox's diagnostics or the clone dialog.
export { CloneRepoDialog } from "@/features/code/views/sandboxes/CloneRepoDialog";
export { SandboxDiagnosticsPanel } from "@/features/code/views/sandboxes/SandboxDiagnosticsPanel";
