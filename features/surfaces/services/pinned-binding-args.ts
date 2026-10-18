import type { UpsertBindingArgs } from "@ai-matrx/chat/surfaces/redux/thunks";

/**
 * A surface binding's payload is REPLACED WHOLESALE on every save, so every
 * writer carries the stored version pin (surface_binding payload v5,
 * `agent_version_id`) — or a mapping/policy/auto-run edit silently unpins the
 * binding and it runs the live agent. The thunk forwards its args to
 * `upsertAgentSurfaceBinding`, which stores `agentVersionId`. (Once the
 * installed @ai-matrx/chat types `UpsertBindingArgs.agentVersionId`, callers
 * can pass it directly and this helper goes.)
 * Guard: features/surfaces/__tests__/every-binding-writer-keeps-the-version-pin.test.ts
 */
export type PinnedUpsertBindingArgs = UpsertBindingArgs & {
  agentVersionId: string | null;
};

export function pinnedBindingArgs(args: PinnedUpsertBindingArgs): UpsertBindingArgs {
  return args;
}
