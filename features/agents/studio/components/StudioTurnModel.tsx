"use client";

/**
 * "This message only" on a Studio run: the next send of THIS conversation runs on another model,
 * then the agent's own model comes back — the chat composer's own turn-only choice
 * (`instance-model-overrides` `pickModelThisTurnOnly`), never a second override path. The trick
 * from the owner's vision: run on a normal model, then ask the last question on a premium one.
 * Offered models come from the canonical picker (its tier gate decides who sees top-tier models).
 */

import { X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
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
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2" data-testid="studio-turn-model">
      <span className="shrink-0 text-xs text-muted-foreground">Next message on</span>
      <ModelListDropdown
        aria-label="Model for the next message only"
        modelOnly
        inputModalities={[]}
        outputModalities={["text"]}
        value={picked}
        onValueChange={(model: string) => {
          dispatch(setModelThisTurnOnly({ conversationId, on: true }));
          dispatch(pickModelThisTurnOnly({ conversationId, model }));
        }}
        className="min-w-0 flex-1"
      />
      {picked ? (
        <Button
          variant="quiet"
          icon={<X />}
          aria-label="Use the agent's own model"
          title="Use the agent's own model"
          onClick={() => dispatch(setModelThisTurnOnly({ conversationId, on: false }))}
        />
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">Agent&apos;s own</span>
      )}
    </div>
  );
}
