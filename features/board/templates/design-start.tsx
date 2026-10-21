"use client";

// THE START OF A BOARD THAT STARTS EMPTY (Arman 2026-10-21, smart-add-brand VISION Part 30): two ways, AI first.
//   1. Build with AI (default): the board is made empty, then opens with the design-system Conductor's run window
//      on it (the Agents menu's Run door, `runHere`), the person's own words about their business as the message.
//   2. Start from a style: a short list of the reference-only styles (`listBoardStyles`, never gallery entries);
//      the chosen one's rows fill the new board (records door inserts), then the AI is offered to adapt it.
// The choice rides from the gallery to the opened board in this tab only (`sessionStorage`, never the URL).

import { Palette, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ai-matrx/design-system";
import { Button, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";

import { listBoardStyles, type BoardStyle } from "./board-packs";
import type { BoardStartChoice } from "./open-design-build";

/** Name the board, then start it: Build with AI (default) or Start from a style. */
export function DesignBoardStartDialog({
  open,
  onOpenChange,
  packKey,
  defaultName,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packKey: string | null;
  defaultName: string;
  onStart: (choice: BoardStartChoice) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [brief, setBrief] = useState("");
  const [step, setStep] = useState<"start" | "style">("start");
  const [styles, setStyles] = useState<BoardStyle[] | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  // A fresh open starts at the AI step with the template's name (adjusted during render, never an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(defaultName);
      setBrief("");
      setStep("start");
      setPicked(null);
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
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Your business</span>
              <ProTextarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={4}
                placeholder="What you do, who for, colors or fonts you use"
                data-testid="design-board-brief"
              />
            </label>
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
              <Button variant="primary" icon={<Wand2 size={16} />} disabled={!named} onClick={() => onStart({ name: named, mode: "ai", brief })}>
                Build with AI
              </Button>
            </>
          ) : (
            <>
              <Button variant="quiet" onClick={() => setStep("start")}>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!style || !named}
                onClick={() => style && onStart({ name: named, mode: "style", styleTemplateId: style.templateId, styleName: style.name })}
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
