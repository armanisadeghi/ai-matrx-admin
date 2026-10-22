"use client";

/**
 * Which model a hosted Codex run uses.
 *
 * The server REQUIRES one (`CodexManagedRequest.model`): left out, the Codex
 * CLI silently uses its own built-in default, which the platform key may not
 * reach. So the person names it here, from the ONE model catalog and the ONE
 * model picker (`ModelListDropdown`), narrowed to OpenAI's models — no list
 * and no default live in this file. What goes on the wire is the catalog row's
 * `name`, the provider's own model identifier (e.g. `gpt-5`).
 */

import { useId } from "react";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { InfoHint } from "@ai-matrx/design-system/controls";
import { useModels } from "@/features/ai-models/hooks/useModels";

/** The catalog maker whose models Codex can run. */
const CODEX_MAKER = "openai";

export interface CodexModelChoice {
  /** The catalog row id (what the picker selects). */
  id: string;
  /** The provider's model identifier — what the run request sends. */
  name: string;
}

export function CodexModelStep({
  value,
  onChange,
}: {
  value: CodexModelChoice | null;
  onChange: (choice: CodexModelChoice | null) => void;
}) {
  const labelId = useId();
  const { models } = useModels();
  const openAi = models.filter(
    (model) => model.maker?.toLowerCase() === CODEX_MAKER,
  );

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        <span id={labelId} className="type-secondary font-medium text-foreground">
          Codex model
        </span>
        <InfoHint
          text="The OpenAI model Codex runs on in your sandbox."
          label="About the Codex model"
        />
      </span>
      <ModelListDropdown
        value={value?.id ?? null}
        modelOnly
        inputModalities={["text"]}
        outputModalities={["text"]}
        allowedModelIds={openAi.map((model) => model.id)}
        placeholder="Choose a model"
        aria-labelledby={labelId}
        onValueChange={(modelId) => {
          const picked = openAi.find((model) => model.id === modelId);
          onChange(picked ? { id: picked.id, name: picked.name } : null);
        }}
      />
    </div>
  );
}
