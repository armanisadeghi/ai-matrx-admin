import type { AgentVariableEditorWindowDefinitionData } from "./agentVariableEditorWindow.overlay";
import { parseVariableEditorInstanceId } from "@/features/agents/components/variables-management/variableEditorAddress";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<AgentVariableEditorWindowDefinitionData>) {
    const address = parseVariableEditorInstanceId(id);
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
