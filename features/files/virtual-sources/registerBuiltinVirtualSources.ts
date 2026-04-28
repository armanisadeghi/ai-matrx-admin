/**
 * features/files/virtual-sources/registerBuiltinVirtualSources.ts
 *
 * Single import-time side-effect file. Imports each adapter (which calls
 * `registerVirtualSource` at module top-level) so the registry is populated
 * once at app boot. Phase 2 wires the actual adapters here; Phase 1 leaves
 * this empty so the foundation lands without behavior change.
 *
 * Mounted from a top-level provider (likely `app/Providers.tsx` or the
 * `/files` route's bootstrap) via a one-line `import "@/features/files/virtual-sources/registerBuiltinVirtualSources"`.
 */

// Each import has a registration side effect via `registerVirtualSource`.
// Order here = order in the cloud-files tree.
import "./adapters/notes";
import "./adapters/code-files";
import "./adapters/aga-apps";
import "./adapters/prompt-apps";
import "./adapters/tool-ui-components";

export {};
