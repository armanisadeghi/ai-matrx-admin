"use client";

// features/crm/components/deals/StagePickDialog.tsx
//
// Bulk "Move to stage" picker: the person CHOOSES a stage (never types one).
// Controlled by DealsPage, which resolves the action's promise on pick/cancel.

import { useState } from "react";
import { Select } from "@ai-matrx/design-system/controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DealPipeline } from "../../deals/types";

/** One pickable target: a stage per pipeline that has it. */
export interface StageChoice {
  key: string;
  name: string;
  label: string;
  /** pipelineId -> the stage id a deal of that pipeline moves to. */
  stageByPipeline: Record<string, string>;
}

/**
 * Union of stage names across the pipelines the selected deals live in.
 * The same name in several pipelines is ONE choice (each deal moves within its
 * own pipeline). Two stages with the same name inside ONE pipeline stay two
 * distinct choices, told apart by position and pipeline name.
 */
export function buildStageChoices(pipelines: DealPipeline[]): StageChoice[] {
  const byKey = new Map<string, StageChoice>();
  const pipelinesOf = new Map<string, string[]>();
  for (const p of pipelines) {
    const seen = new Map<string, number>();
    for (const st of p.stages) {
      const base = st.name.trim().toLowerCase();
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const key = `${base}#${n}`;
      let choice = byKey.get(key);
      if (!choice) {
        choice = { key, name: st.name.trim(), label: st.name.trim(), stageByPipeline: {} };
        byKey.set(key, choice);
      }
      choice.stageByPipeline[p.id] = st.id;
      pipelinesOf.set(key, [...(pipelinesOf.get(key) ?? []), p.name]);
    }
  }
  const multiPipeline = pipelines.length > 1;
  const nameCount = new Map<string, number>();
  for (const c of byKey.values()) {
    nameCount.set(c.name.toLowerCase(), (nameCount.get(c.name.toLowerCase()) ?? 0) + 1);
  }
  for (const c of byKey.values()) {
    const ordinal = Number(c.key.split("#")[1]);
    const where = pipelinesOf.get(c.key) ?? [];
    const dup = (nameCount.get(c.name.toLowerCase()) ?? 0) > 1;
    const bits: string[] = [];
    if (dup) bits.push(`#${ordinal + 1}`);
    if (multiPipeline && (dup || where.length < pipelines.length)) {
      bits.push(where.join(", "));
    }
    if (bits.length) c.label = `${c.name} (${bits.join(" · ")})`;
  }
  return [...byKey.values()];
}

function StagePickBody({
  choices,
  onPick,
  onCancel,
}: {
  choices: StageChoice[];
  onPick: (choice: StageChoice) => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState("");
  const chosen = choices.find((c) => c.key === key);
  return (
    <>
      <Select
        aria-label="Stage"
        value={key}
        onValueChange={setKey}
        options={choices.map((c) => ({ value: c.key, label: c.label }))}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!chosen}
          onClick={() => chosen && onPick(chosen)}
        >
          Continue
        </Button>
      </DialogFooter>
    </>
  );
}

export function StagePickDialog({
  open,
  count,
  choices,
  onPick,
  onCancel,
}: {
  open: boolean;
  count: number;
  choices: StageChoice[];
  onPick: (choice: StageChoice) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move {count} {count === 1 ? "deal" : "deals"} to a stage
          </DialogTitle>
          <DialogDescription>Each deal moves within its own pipeline.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the choice resets on every open. */}
        <StagePickBody choices={choices} onPick={onPick} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
}
