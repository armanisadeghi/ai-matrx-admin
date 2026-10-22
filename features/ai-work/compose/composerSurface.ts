// features/ai-work/compose/composerSurface.ts
//
// /work/new's agent surface (`matrx-user/ai-work-composer`): ONE pure builder
// from the state the composer already rendered — never a fetch. The composer's
// own run is declared on the provider (`ownConversationId`), so the run being
// assembled here never sees this page; every other agent on the screen does.

import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { createAiWorkComposerScope } from "@/features/surfaces/manifests/ai-work-composer.manifest";
import type { SavedRequestHome } from "./savedRequests";

export interface ComposerScopeInput {
  requestText: string;
  destinationId: string;
  destinationAvailable: boolean;
  /** A device id when the run goes to one of the person's Matrx 2 computers. */
  runsOnName: string | null;
  agentId: string;
  agentName: string | null;
  conversationId: string | null;
  skillIds: readonly string[];
  homes: readonly SavedRequestHome[];
  localFolder: string;
  savedLabel: string;
  savedRequestId: string | null;
  launchedConversationId: string | null;
  canRun: boolean;
  runStatus: string | null;
}

export function buildComposerScope(input: ComposerScopeInput): SurfaceScopePayload {
  const request = input.requestText.trim();
  const label = input.savedLabel.trim();
  const folder = input.localFolder.trim();
  return createAiWorkComposerScope({
    destination_id: input.runsOnName ? `computer:${input.runsOnName}` : input.destinationId,
    destination_available: input.destinationAvailable,
    agent_id: input.agentId,
    skill_ids: [...input.skillIds],
    home_targets: input.homes.map((h) => ({ token: h.token, id: h.id, label: h.label })),
    request_text: request,
    can_run: input.canRun,
    ...(input.runStatus ? { run_status: input.runStatus } : {}),
    ...(label ? { saved_request_label: label } : {}),
    ...(input.savedRequestId ? { saved_request_id: input.savedRequestId } : {}),
    ...(folder ? { local_folder: folder } : {}),
    ...(input.agentName ? { agent_name: input.agentName } : {}),
    ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
    ...(input.launchedConversationId
      ? { launched_conversation_id: input.launchedConversationId }
      : {}),
  });
}
