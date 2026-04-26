import { registerMonacoEnvironment } from "./registry";
import { PROMPT_APP_ENVIRONMENT } from "./envs/prompt-app";
import { AGA_APP_ENVIRONMENT } from "./envs/aga-app";
import { TOOL_UI_ENVIRONMENT } from "./envs/tool-ui";
import { LIBRARY_ENVIRONMENT } from "./envs/library";
import { SANDBOX_FS_ENVIRONMENT } from "./envs/sandbox-fs";
import { HTML_ENVIRONMENT } from "./envs/html";

export {
  registerMonacoEnvironment,
  listMonacoEnvironments,
  getMonacoEnvironment,
  resolveEnvironmentForTab,
  activateEnvironment,
  deactivateEnvironment,
  applyEnvironmentOptions,
  __resetMonacoEnvironmentsForTests,
} from "./registry";

export { useEnvironmentForActiveTab } from "./useEnvironmentForActiveTab";

export type {
  MonacoEnvironmentDescriptor,
  MonacoEnvironmentLib,
  MonacoNamespaceLike,
  MonacoTsLikeDefaults,
  MonacoDisposable,
} from "./types";

// Order matters — `applies()` runs in registration order, so register
// the more specific (prefix-keyed) envs before the catch-all `html`
// language env.
let registered = false;
export function registerDefaultMonacoEnvironments(): void {
  if (registered) return;
  registered = true;
  registerMonacoEnvironment(PROMPT_APP_ENVIRONMENT);
  registerMonacoEnvironment(AGA_APP_ENVIRONMENT);
  registerMonacoEnvironment(TOOL_UI_ENVIRONMENT);
  registerMonacoEnvironment(LIBRARY_ENVIRONMENT);
  registerMonacoEnvironment(SANDBOX_FS_ENVIRONMENT);
  registerMonacoEnvironment(HTML_ENVIRONMENT);
}

// Side-effect register on first import.
registerDefaultMonacoEnvironments();
