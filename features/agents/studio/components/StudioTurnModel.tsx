"use client";

/**
 * "Next reply on …" for a Studio run: the next send of THIS conversation runs on another model,
 * then the agent's own model comes back — the chat composer's own turn-only choice
 * (`instance-model-overrides` `pickModelThisTurnOnly`), never a second override path. The trick
 * from the owner's vision: run on a normal model, then ask the last question on a premium one.
 * Offered models come from the canonical picker (its tier gate decides who sees top-tier models);
 * "Agent's model" is the picker's own first choice, so the way back is inside the same menu.
 */

import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import {
  pickModelThisTurnOnly,
  setModelThisTurnOnly,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-model-overrides/instance-model-overrides.slice";
import { selectTurnOnlyModelChoice } from "@ai-matrx/chat/agents/redux/execution-system/instance-model-overrides/instance-model-overrides.selectors";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

export function StudioTurnModel({ conversationId }: { conversationId: string }) {
  const dispatch = useAppDispatch();
  const choice = useAppSelector(selectTurnOnlyModelChoice(conversationId));
  const picked = choice?.on ? choice.model : null;
  return (
    <div className="flex min-w-0 items-center gap-1" data-testid="studio-turn-model">
      <span className="shrink-0 px-1 text-xs text-muted-foreground">Next reply</span>
      <ModelListDropdown
        aria-label="Model for the next reply only"
        modelOnly
        inputModalities={[]}
        outputModalities={["text"]}
        value={picked}
        placeholder="Agent's model"
        emptyOptionLabel="Agent's model"
        onClear={() => dispatch(setModelThisTurnOnly({ conversationId, on: false }))}
        onValueChange={(model: string) => {
          dispatch(setModelThisTurnOnly({ conversationId, on: true }));
          dispatch(pickModelThisTurnOnly({ conversationId, model }));
        }}
        className="min-w-0 max-w-[15rem]"
      />
    </div>
  );
}
