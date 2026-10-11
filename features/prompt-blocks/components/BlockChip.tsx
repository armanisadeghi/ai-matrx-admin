"use client";

import { cn } from "@/lib/utils";
import type { BlockChipState } from "../tokens";

const TONE: Record<BlockChipState, string> = {
  ok: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  missing: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800",
  undeclared: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
};

const TITLE: Record<BlockChipState, (name: string) => string> = {
  ok: (name) => `Prompt block ${name}`,
  missing: (name) => `No block named ${name} at any level`,
  undeclared: (name) => `${name} is not declared on this agent`,
};

/** A `{{<name>}}` token, drawn apart from variable chips (sky, not green). Click opens its panel. */
export function BlockChip({ name, state, onOpen }: { name: string; state: BlockChipState; onOpen: (name: string, rect: DOMRect) => void }) {
  return (
    <button
      type="button"
      data-testid={`prompt-block-chip-${name}`}
      data-state={state}
      title={TITLE[state](name)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(name, e.currentTarget.getBoundingClientRect());
      }}
      className={cn("inline rounded-md border px-1 py-0.5 text-[inherit] font-medium leading-[inherit] cursor-pointer", TONE[state])}
    >
      {`{{<${name}>}}`}
      {state === "missing" && <span className="ml-1 text-[10px] font-semibold uppercase">Missing</span>}
      {state === "undeclared" && <span className="ml-1 text-[10px] font-semibold uppercase">Not declared</span>}
    </button>
  );
}

export interface BlockHighlight {
  declared: ReadonlySet<string>;
  missing: ReadonlySet<string>;
  onOpen: (name: string, rect: DOMRect) => void;
}
