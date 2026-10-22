/**
 * `@ai-matrx/chat`'s own manifests, placed under their module (surface declarations W1).
 *
 * The module surfaces (`module-surfaces.manifest.ts`) are this app's registry; the chat package
 * also registers its manifests in apps that have no modules, so the package source cannot name a
 * module parent without breaking them (an unknown parent throws at registry init). The app adds
 * the parent here, and `registry.ts` imports these instead of the package's objects so the
 * registry, the generated surface index and the DB mirror all see the same chain. Each entry
 * keeps the package object whole and adds ONLY `inheritsFrom`; a package manifest that starts
 * declaring its own parent is refused below rather than silently overridden.
 */

import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";
import { agentBuilderManifest as pkgAgentBuilder } from "@ai-matrx/chat/surfaces/manifests/agent-builder.manifest";
import { agentRunManifest as pkgAgentRun } from "@ai-matrx/chat/surfaces/manifests/agent-run.manifest";
import { agentGateManifest as pkgAgentGate } from "@ai-matrx/chat/surfaces/manifests/agent-gate.manifest";
import { agentRunHistoryManifest as pkgAgentRunHistory } from "@ai-matrx/chat/surfaces/manifests/agent-run-history.manifest";
import { chatManifest as pkgChat } from "@ai-matrx/chat/surfaces/manifests/chat.manifest";
import { aiResultsManifest as pkgAiResults } from "@ai-matrx/chat/surfaces/manifests/ai-results.manifest";
import { observationalMemoryManifest as pkgObservationalMemory } from "@ai-matrx/chat/surfaces/manifests/observational-memory.manifest";
import { chatVoiceManifest as pkgChatVoice } from "@ai-matrx/chat/surfaces/manifests/chat-voice.manifest";
import { quickNoteSaveManifest as pkgQuickNoteSave } from "@ai-matrx/chat/surfaces/manifests/quick-note-save.manifest";
import { documentsWorkspaceManifest as pkgDocumentsWorkspace } from "@ai-matrx/chat/surfaces/manifests/documents-workspace.manifest";
import { adminUiSurfacesManifest as pkgAdminUiSurfaces } from "@ai-matrx/chat/surfaces/manifests/admin-ui-surfaces.manifest";

function underModule<M extends SurfaceManifest>(manifest: M, module: string): M {
  if (manifest.inheritsFrom && manifest.inheritsFrom !== module) {
    throw new Error(
      `[surfaces] "${manifest.surfaceName}" (from @ai-matrx/chat) now declares inheritsFrom "${manifest.inheritsFrom}"; ` +
        `the app placed it under "${module}". Decide one parent and delete the other.`,
    );
  }
  return { ...manifest, inheritsFrom: module };
}

// Agents
export const agentBuilderManifest = underModule(pkgAgentBuilder, "matrx-default/agents");
export const agentRunManifest = underModule(pkgAgentRun, "matrx-default/agents");
export const agentGateManifest = underModule(pkgAgentGate, "matrx-default/agents");
export const agentRunHistoryManifest = underModule(pkgAgentRunHistory, "matrx-default/agents");
// Chat
export const chatManifest = underModule(pkgChat, "matrx-default/chat");
export const aiResultsManifest = underModule(pkgAiResults, "matrx-default/chat");
export const observationalMemoryManifest = underModule(pkgObservationalMemory, "matrx-default/chat");
// Voice chat deliberately does NOT inherit `matrx-user/chat` (most of the chat vocabulary is false
// with no text composer — see the package manifest's header), so it sits directly under the module.
export const chatVoiceManifest = underModule(pkgChatVoice, "matrx-default/chat");
// Content
export const quickNoteSaveManifest = underModule(pkgQuickNoteSave, "matrx-default/content");
export const documentsWorkspaceManifest = underModule(pkgDocumentsWorkspace, "matrx-default/content");
// Platform
export const adminUiSurfacesManifest = underModule(pkgAdminUiSurfaces, "matrx-default/platform");
