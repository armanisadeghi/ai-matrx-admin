"use client";

// THE START OF A BOARD THAT STARTS EMPTY (Arman 2026-10-21/22, smart-add-brand VISION Parts 30-31): two ways, AI first.
//   1. Create (default): the board is made empty and opens with the design agent already building it in the side
//      chat, talking first; the person clicks and types nothing more (`board-start.ts`, `startShellChatJob` `run`).
//   2. Start from a style: a short list of the reference-only styles (`listBoardStyles`, never gallery entries);
//      the chosen one's rows fill the new board (records door inserts), then the AI is offered to adapt it.
// From the press until the board opens the dialog shows the work in place (`progress`): the stages, the current
// one shimmering. The choice rides from the gallery to the opened board in this tab only (`sessionStorage`).

import { Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ai-matrx/design-system";
import { Button, RegionSkeleton, StageSteps } from "@ai-matrx/design-system/controls";
import { ShimmerText } from "@ai-matrx/design-system";
import { ProInput } from "@/components/official/ProInput";

import { BrandPicker } from "@/features/marketing/components/brands/BrandPicker";
import { listBoardStyles, type BoardStyle } from "./board-packs";
import type { BoardStartChoice } from "./board-start";

/** The work after the press, shown in place until the board opens. `detail` = the maker's own stage line. */
export type DesignBoardProgress = { mode: "ai" | "style"; step: "board" | "start"; detail?: string | null };

/** The stages a start goes through; pure (tested). */
export function designBoardStages(mode: "ai" | "style"): { id: string; label: string }[] {
  return mode === "ai"
    ? [
        { id: "board", label: "Making the board" },
        { id: "start", label: "Starting the design agent" },
      ]
    : [
        { id: "board", label: "Making the board" },
        { id: "start", label: "Opening the board" },
      ];
}

/** Name the board, then start it: the AI builds it (default) or Start from a style. */
export function DesignBoardStartDialog({
  open,
  onOpenChange,
  packKey,
  defaultName,
  onStart,
  progress = null,
  defaultBrandId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packKey: string | null;
  defaultName: string;
  onStart: (choice: BoardStartChoice) => void;
  /** Set from the press until the board opens: the dialog shows the stages instead of the form. */
  progress?: DesignBoardProgress | null;
  /** The brand chosen when the dialog opens (opened from a brand's page). */
  defaultBrandId?: string | null;
}) {
  const [name, setName] = useState(defaultName);
  const [step, setStep] = useState<"start" | "style">("start");
  const [styles, setStyles] = useState<BoardStyle[] | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  // ONE START PER PRESS (live 2026-10-22: a double-click on Create made two boards). The ref latches in the same
  // tick as the first press, so a second click before any re-render starts nothing; the state disables the button.
  // A fresh open, or a start that failed (progress went away without the board opening), frees it again.
  const pressedRef = useRef(false);
  const [pressed, setPressed] = useState(false);
  const [hadProgress, setHadProgress] = useState(Boolean(progress));
  if (Boolean(progress) !== hadProgress) {
    setHadProgress(Boolean(progress));
    if (!progress) setPressed(false);
  }
  useEffect(() => {
    pressedRef.current = pressed;
  }, [pressed]);
  const start = (choice: BoardStartChoice) => {
    if (pressedRef.current) return;
    pressedRef.current = true;
    setPressed(true);
    onStart(choice);
  };

  // A fresh open starts at the AI step with the template's name (adjusted during render, never an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(defaultName);
      setStep("start");
      setPicked(null);
      setBrandId(defaultBrandId);
      setPressed(false);
    }
  }

  useEffect(() => {
    if (step !== "style" || !packKey || styles) return;
    let live = true;
    listBoardStyles(packKey).then(
      (all) => live && (setStyles(all), setStylesError(null)),
      (e: unknown) => live && setStylesError(e instanceof Error ? e.message : "We couldn't list the styles."),
    );
    return () => {
      live = false;
    };
  }, [step, packKey, styles]);

  const named = name.trim();
  const style = styles?.find((s) => s.templateId === picked) ?? null;

  if (progress) {
    const stages = designBoardStages(progress.mode);
    const at = Math.max(0, stages.findIndex((st) => st.id === progress.step));
    const line = progress.step === "board" && progress.detail ? progress.detail : `${stages[at].label}…`;
    return (
      // The work cannot be canceled half way: the dialog stays until the board opens.
      <Dialog open={open} onOpenChange={() => undefined}>
        {/* While it builds there is nothing to close: no close control (it did nothing). */}
        <DialogContent className="max-w-lg" showCloseButton={false} data-testid="design-board-start" data-building="">
          <DialogHeader>
            <DialogTitle>{named || defaultName}</DialogTitle>
            <DialogDescription className="sr-only">Your board is being made.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2" role="status" aria-live="polite">
            <StageSteps steps={stages} current={at} aria-label="Making your board" />
            <ShimmerText text={line} className="text-sm" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="design-board-start">
        <DialogHeader>
          <DialogTitle>{step === "start" ? "New design system" : "Start from a style"}</DialogTitle>
          <DialogDescription>{step === "start" ? "The AI builds it for your business." : "Pick a style; the AI can adapt it after."}</DialogDescription>
        </DialogHeader>
        {step === "start" ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Board name</span>
              <ProInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme design system" autoFocus />
            </label>
            <BrandPicker organizationId={null} value={brandId} onChange={setBrandId} allowAll allLabel="No brand yet" label="Brand (optional)" />
          </div>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto" role="radiogroup" aria-label="Styles">
            {stylesError ? <p className="text-sm text-destructive">{stylesError}</p> : null}
            {!styles && !stylesError ? <RegionSkeleton shape="rows" count={5} twoLine aria-label="Loading styles" /> : null}
            {styles?.map((s) => (
              <button
                key={s.templateId}
                type="button"
                role="radio"
                aria-checked={picked === s.templateId}
                onClick={() => setPicked(s.templateId)}
                className={`flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors ${
                  picked === s.templateId ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{s.name}</span>
                {s.forWho ? <span className="text-xs text-muted-foreground">{s.forWho}</span> : null}
              </button>
            ))}
          </div>
        )}
        <DialogFooter className="gap-2">
          {step === "start" ? (
            <>
              <Button variant="outline" icon={<Palette size={16} />} onClick={() => setStep("style")} disabled={!named}>
                Start from a style
              </Button>
              <Button variant="primary" disabled={!named || pressed} onClick={() => start({ name: named, mode: "ai", brandId })}>
                Create
              </Button>
            </>
          ) : (
            <>
              <Button variant="quiet" onClick={() => setStep("start")}>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!style || !named || pressed}
                onClick={() => style && start({ name: named, mode: "style", styleTemplateId: style.templateId, styleName: style.name, brandId })}
              >
                Use style
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
