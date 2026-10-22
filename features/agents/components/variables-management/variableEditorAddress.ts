/**
 * THE VARIABLE EDITOR'S ADDRESS (R35 — every window with a durable subject has one).
 *
 * The editor's subject is a PAIR: which agent, and which of its variables. One
 * without the other opens a frame with nothing in it, so the pair is written and
 * read here together and never drifts apart.
 *
 * Wire form (summon's link grammar, never hand-built):
 * `?panels=agent_variable:<agentId>:v-<variableName>` — the agent is the token id,
 * the variable name rides as the `v` arg, and summon escapes both.
 */

export interface VariableEditorAddress {
  agentId: string;
  variableName: string;
}

/** The arg key the variable name rides under. */
export const VARIABLE_ARG = "v";

/** The token id + args a link to this editor carries (`WindowPanel` urlSyncId/urlSyncArgs, `formatLinkToken`). */
export function variableEditorLink({ agentId, variableName }: VariableEditorAddress): {
  id: string;
  args: Record<string, string>;
} {
  return { id: agentId, args: { [VARIABLE_ARG]: variableName } };
}

/** Null for half an identity — the caller says so rather than opening an empty frame. */
export function parseVariableEditorLink(
  id: string | null | undefined,
  args: Readonly<Record<string, string>> | undefined,
): VariableEditorAddress | null {
  const variableName = args?.[VARIABLE_ARG];
  if (!id || !variableName) return null;
  return { agentId: id, variableName };
}
