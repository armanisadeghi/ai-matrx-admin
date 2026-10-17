"use client";

/**
 * The prefill warning an author SEES (not a hover tooltip): when a prefill is set
 * on a model that cannot take one, say what will happen and offer the way out —
 * a menu, never a block. The run still works (the org's compatibility mode
 * decides: convert by default); this is the author's chance to do better.
 */

import { ChevronDown, TriangleAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ai-matrx/design-system";
import type { FlagVerdict } from "@ai-matrx/chat/agents/message-flags/flags";
import { prefillWarning } from "./prefillWayOut";

interface PrefillCompatNoteProps {
  /** Whether this message currently carries the Prefill flag. */
  prefillOn: boolean;
  verdict: FlagVerdict;
  onPickModel: () => void;
  onMoveIntoInstructions: () => void;
  onRemovePrefill: () => void;
}

export function PrefillCompatNote({
  prefillOn,
  verdict,
  onPickModel,
  onMoveIntoInstructions,
  onRemovePrefill,
}: PrefillCompatNoteProps) {
  const warning = prefillOn ? prefillWarning(verdict) : null;
  if (!warning) return null;
  return (
    <div
      className="mx-2 mb-1 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-400"
      data-testid="prefill-compat-note"
      data-verdict={verdict.verdict}
      role="status"
    >
      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="min-w-0 flex-1">{warning}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 font-medium hover:bg-amber-500/20"
            data-testid="prefill-compat-fix"
          >
            Fix
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[9999] text-xs">
          <DropdownMenuItem onSelect={onPickModel} data-testid="prefill-fix-model">
            Choose a model that supports prefill
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onMoveIntoInstructions} data-testid="prefill-fix-instructions">
            Move it into the instructions
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onRemovePrefill} data-testid="prefill-fix-remove">
            Remove the prefill
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
