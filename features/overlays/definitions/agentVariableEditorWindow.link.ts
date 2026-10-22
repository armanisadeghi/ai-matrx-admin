import type { AgentVariableEditorWindowDefinitionData } from "./agentVariableEditorWindow.overlay";
import { parseVariableEditorLink } from "@/features/agents/components/variables-management/variableEditorAddress";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, args }: LinkHydrateContext<AgentVariableEditorWindowDefinitionData>) {
    const address = parseVariableEditorLink(id, args);
    if (!address) {
      // Nothing fails silently: half an identity has no variable to edit, and
      // an empty editor would be worse than not restoring at all.
      console.warn(
        `[initUrlHydration] Ignoring "?panels=agent_variable:${id}": the variable ` +
          `editor is addressed as "<agentId>|<variableName>". Re-copy the link ` +
          "from the editor's own window controls.",
      );
      return;
    }
    dispatch(
      openOverlay({
        overlayId: "agentVariableEditorWindow",
        instanceId: "default",
        data: { ...address, justCreated: false },
      }),
    );
}
