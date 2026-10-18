"use client";

/**
 * An agent's inputs as THE variable pills (`@ai-matrx/rich-content` VariableChip, the same pill the
 * builder's prompt boxes draw): the pretty name with its input glyph, and hovering or focusing one
 * opens THE variable Peek (help, input, default, options). Read only; the stored names are untouched.
 */

import { MatrxVariableInline } from "@ai-matrx/rich-content/display/chat-markdown/matrx-variables/MatrxVariableInline";
import { VariableDefinitionsProvider } from "@ai-matrx/rich-content/display/chat-markdown/matrx-variables/VariableDefinitions";
import type { DeclaredVariable } from "@ai-matrx/rich-content/editor/core/variables";

export interface StudioInputDefinition {
  name: string;
  label?: string;
  helpText?: string;
  required?: boolean;
  defaultValue?: unknown;
  customComponent?: { type?: string; options?: string[] } | null;
}

/** The agent's variable definitions as the Peek reads them. Pure, so it is tested. */
export function declaredInputs(defs: readonly StudioInputDefinition[]): DeclaredVariable[] {
  return defs.map((d) => ({
    name: d.name,
    ...(d.label ? { label: d.label } : {}),
    ...(d.helpText ? { helpText: d.helpText } : {}),
    ...(d.required !== undefined ? { required: d.required } : {}),
    ...(d.defaultValue !== undefined ? { defaultValue: d.defaultValue } : {}),
    ...(d.customComponent?.type ? { type: d.customComponent.type } : {}),
    ...(d.customComponent?.options?.length ? { options: d.customComponent.options } : {}),
  }));
}

export function StudioInputPills({ definitions }: { definitions: readonly StudioInputDefinition[] }) {
  return (
    <VariableDefinitionsProvider variables={declaredInputs(definitions)}>
      <div className="flex flex-wrap gap-1.5 text-sm" data-testid="studio-input-pills">
        {definitions.map((d) => (
          <MatrxVariableInline key={d.name} name={d.name} />
        ))}
      </div>
    </VariableDefinitionsProvider>
  );
}
