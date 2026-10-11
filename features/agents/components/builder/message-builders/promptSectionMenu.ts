import { wrapSelectionInText } from "@ai-matrx/chat/agents/utils/variable-utils";
import type { ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import { sectionMenuSection } from "@ai-matrx/rich-editor/core/section-menu";

/**
 * Right-click on a selected piece of a prompt textarea: "Only include when filled / empty" over the
 * agent's variables. Wraps the selection in a conditional section (`{{#name}}…{{/name}}`).
 * Pass as the menu's `resolveExtraSectionsOnOpen`; the selection is read when the menu opens.
 */
export function promptSectionSections(options: {
  variableNames: readonly string[];
  getTextarea: () => HTMLTextAreaElement | null;
  onChange: (text: string) => void;
}): ContextMenuExtraSection[] | undefined {
  const { variableNames, getTextarea, onChange } = options;
  const section = sectionMenuSection({
    variables: variableNames.map((name) => ({ name })),
    hasSelection: () => {
      const textarea = getTextarea();
      return !!textarea && textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim() !== "";
    },
    wrap: (name, when) => {
      const textarea = getTextarea();
      if (!textarea || textarea.selectionStart === textarea.selectionEnd) return;
      onChange(wrapSelectionInText(textarea.value, textarea.selectionStart, textarea.selectionEnd, name, when).text);
    },
  });
  return section ? [section as ContextMenuExtraSection] : undefined;
}
