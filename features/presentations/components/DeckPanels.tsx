"use client";

/**
 * The dialogs behind the Slides menu rows that are not one-click: Find and replace, Change
 * background, Motion (slide transitions), Special characters, Comments, Theme builder, Import
 * slides, Accessibility. Each only dispatches deck actions (`deck-model`) — no state of its own
 * that belongs in the deck.
 */

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Select, Switch } from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveDeckTheme } from "@/components/mardown-display/blocks/presentations/presets";
import { mediaClient } from "@/features/files/media-client/client";
import { extractOfficeMarkdown } from "@/features/files/api/office";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectDisplayName } from "@/lib/redux/selectors/userSelectors";
import type { Deck, DeckAction, DeckSlide } from "../deck-model";
import { portionsToSlides } from "../deck-import";
import { findInDeck, slideBackgroundOf, slideTransitionOf, commentsOf, TRANSITIONS, type TransitionKind } from "../deck-slide-ops";
import { SPECIAL_CHAR_GROUPS, searchSpecialChars } from "../deck-special-chars";
import { listAccessiblePresentations, getPresentation } from "../presentation-service";
import { isServiceFailure } from "@/features/data-tables/types";
import { getDeckA11y, setDeckA11y, useDeckA11y } from "../deck-a11y";

type Common = { open: boolean; onOpenChange: (open: boolean) => void };

function Shell({ open, onOpenChange, title, children, footer, width = "max-w-md", marker }: Common & { title: string; children: ReactNode; footer?: ReactNode; width?: string; marker: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={width} {...{ [marker]: "" }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">{children}</div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      {children}
    </div>
  );
}

// ── Find and replace ────────────────────────────────────────────────────────

export function FindReplaceDialog({ open, onOpenChange, deck, dispatch, goTo }: Common & { deck: Deck; dispatch: (a: DeckAction) => void; goTo: (slideIndex: number) => void }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [at, setAt] = useState(0);
  const hits = useMemo(() => findInDeck(deck.slides, find, matchCase), [deck.slides, find, matchCase]);
  const pos = hits.length === 0 ? -1 : Math.min(at, hits.length - 1);
  const hit = pos >= 0 ? hits[pos] : undefined;
  const move = (dir: 1 | -1) => {
    if (hits.length === 0) return;
    const next = (pos + dir + hits.length) % hits.length;
    setAt(next);
    goTo(hits[next]!.slideIndex);
  };
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Find and replace"
      marker="data-deck-find"
      footer={
        <>
          <Button variant="outline" disabled={!hit} onClick={() => hit && dispatch({ type: "replaceOne", index: hit.slideIndex, location: hit.location, find, replace, matchCase })}>
            Replace
          </Button>
          <Button variant="primary" disabled={hits.length === 0} onClick={() => dispatch({ type: "replaceAll", find, replace, matchCase })}>
            Replace all
          </Button>
        </>
      }
    >
      <ProInput aria-label="Find" placeholder="Find" value={find} onChange={(e) => setFind(e.target.value)} onKeyDown={(e) => e.key === "Enter" && move(e.shiftKey ? -1 : 1)} autoFocus />
      <ProInput aria-label="Replace with" placeholder="Replace with" value={replace} onChange={(e) => setReplace(e.target.value)} />
      <Row label="Match case">
        <Switch aria-label="Match case" checked={matchCase} onCheckedChange={setMatchCase} />
      </Row>
      <div className="flex items-center justify-between text-sm" data-find-count="">
        <span aria-live="polite">{find ? (hits.length === 0 ? "No results" : `${pos + 1} of ${hits.length}`) : ""}</span>
        <span className="flex gap-1">
          <Button variant="outline" disabled={hits.length === 0} onClick={() => move(-1)}>
            Previous
          </Button>
          <Button variant="outline" disabled={hits.length === 0} onClick={() => move(1)}>
            Next
          </Button>
        </span>
      </div>
    </Shell>
  );
}

// ── Change background ───────────────────────────────────────────────────────

export function BackgroundDialog({ open, onOpenChange, deck, current, dispatch, presentationId }: Common & { deck: Deck; current: number; dispatch: (a: DeckAction) => void; presentationId: string }) {
  const bg = slideBackgroundOf(deck.slides[current]);
  const [color, setColor] = useState(bg?.color ?? "#FFFFFF");
  const [all, setAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const apply = (background: { color?: string; image?: string } | null) => {
    dispatch({ type: "setBackground", index: current, background, allSlides: all });
    onOpenChange(false);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { fileId } = await mediaClient.upload(file, { fileName: file.name, mimeType: file.type, shownTo: "everyone", metadata: { purpose: "presentation_background", presentation_id: presentationId } });
      apply({ image: fileId });
    } catch (err) {
      toast.error("Could not upload the image", { description: err instanceof Error ? err.message : String(err) });
    }
  };
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Change background"
      marker="data-deck-background"
      footer={
        <>
          <Button variant="outline" onClick={() => apply(null)}>
            Reset
          </Button>
          <Button variant="primary" onClick={() => apply({ color })}>
            Apply colour
          </Button>
        </>
      }
    >
      <Row label="Colour">
        {/* ui-exception: a raw colour value, not user-authored text */}
        <input type="color" aria-label="Background colour" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-14 rounded border border-border bg-transparent" />
      </Row>
      <Row label="Image">
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          Choose image
        </Button>
      </Row>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void upload(f); }} />
      <Row label="Apply to every slide">
        <Switch aria-label="Apply to every slide" checked={all} onCheckedChange={setAll} />
      </Row>
    </Shell>
  );
}

// ── Motion (transitions) ────────────────────────────────────────────────────

export function MotionDialog({ open, onOpenChange, deck, current, dispatch }: Common & { deck: Deck; current: number; dispatch: (a: DeckAction) => void }) {
  const t = slideTransitionOf(deck.slides[current]);
  const [kind, setKind] = useState<TransitionKind>(t.kind);
  const [ms, setMs] = useState(String(t.ms));
  const [all, setAll] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setKind(t.kind);
      setMs(String(t.ms));
    }
  }
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Motion"
      marker="data-deck-motion"
      footer={
        <Button
          variant="primary"
          onClick={() => {
            dispatch({ type: "setTransition", index: current, transition: kind === "none" ? null : { kind, ms: Math.max(100, Math.min(5000, Number(ms) || 500)) }, allSlides: all });
            onOpenChange(false);
          }}
        >
          Apply
        </Button>
      }
    >
      <Select aria-label="Slide transition" value={kind} onValueChange={(v) => setKind(v as TransitionKind)} options={TRANSITIONS.map((x) => ({ value: x.key, label: x.label }))} />
      <Row label="Duration (ms)">
        {/* ui-exception: a number */}
        <input aria-label="Duration in milliseconds" inputMode="numeric" value={ms} onChange={(e) => setMs(e.target.value.replace(/\D/g, ""))} className="h-7 w-20 rounded border border-border bg-transparent px-2 text-right" />
      </Row>
      <Row label="Apply to every slide">
        <Switch aria-label="Apply to every slide" checked={all} onCheckedChange={setAll} />
      </Row>
    </Shell>
  );
}

// ── Special characters ──────────────────────────────────────────────────────

export function SpecialCharsDialog({ open, onOpenChange, onInsert }: Common & { onInsert: (char: string) => void }) {
  const [q, setQ] = useState("");
  const shown = q.trim() ? searchSpecialChars(q) : null;
  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Insert special character" marker="data-deck-special" width="max-w-lg">
      <ProInput aria-label="Search characters" placeholder="Search by name, e.g. arrow or euro" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="max-h-[50vh] overflow-y-auto">
        {(shown ? [{ id: "found", label: shown.length ? "Results" : "No results", chars: shown }] : SPECIAL_CHAR_GROUPS).map((g) => (
          <div key={g.id} className="mb-3">
            <div className="mb-1 text-xs text-muted-foreground">{g.label}</div>
            <div className="flex flex-wrap gap-1">
              {g.chars.map((c) => (
                <button key={c.char + c.name} type="button" data-clickable title={c.name} aria-label={c.name || c.char} className="flex size-9 items-center justify-center rounded border border-border text-lg hover:bg-accent" onClick={() => { onInsert(c.char); onOpenChange(false); }}>
                  {c.char}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ── Comments ────────────────────────────────────────────────────────────────

export function CommentsDialog({ open, onOpenChange, deck, current, dispatch, canEdit }: Common & { deck: Deck; current: number; dispatch: (a: DeckAction) => void; canEdit: boolean }) {
  const author = useAppSelector(selectDisplayName) || "You";
  const [text, setText] = useState("");
  const comments = commentsOf(deck.slides[current]);
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={`Comments on slide ${current + 1}`} marker="data-deck-comments">
      <ul className="max-h-[40vh] divide-y divide-border overflow-y-auto text-sm">
        {comments.length === 0 ? <li className="py-2 text-muted-foreground">No comments yet</li> : null}
        {comments.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-2 py-2" data-comment={c.id}>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                {c.author} · {new Date(c.at).toLocaleString()}
                {c.resolved ? " · resolved" : ""}
              </div>
              <div className={c.resolved ? "text-muted-foreground line-through" : ""}>{c.text}</div>
            </div>
            {canEdit ? (
              <span className="flex shrink-0 gap-1">
                <Button variant="quiet" onClick={() => dispatch({ type: "resolveComment", index: current, id: c.id, resolved: !c.resolved })}>
                  {c.resolved ? "Reopen" : "Resolve"}
                </Button>
                <Button variant="quiet" onClick={() => dispatch({ type: "deleteComment", index: current, id: c.id })}>
                  Delete
                </Button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <>
          <ProTextarea aria-label="New comment" placeholder="Add a comment" value={text} onChange={(e) => setText(e.target.value)} minHeight={56} autoGrow />
          <div className="flex justify-end">
            <Button
              variant="primary"
              disabled={!text.trim()}
              onClick={() => {
                dispatch({ type: "addComment", index: current, comment: { id: crypto.randomUUID(), author, text: text.trim(), at: new Date().toISOString() } });
                setText("");
              }}
            >
              Comment
            </Button>
          </div>
        </>
      ) : null}
    </Shell>
  );
}

// ── Theme builder ───────────────────────────────────────────────────────────

const FONTS = [
  { value: "sans", label: "Sans serif" },
  { value: "serif", label: "Serif" },
  { value: "display", label: "Display" },
];
const VARIANTS = [
  { value: "generic", label: "Plain" },
  { value: "fancy", label: "Accent" },
  { value: "deluxe", label: "Deluxe" },
];

export function ThemeBuilderDialog({ open, onOpenChange, deck, dispatch }: Common & { deck: Deck; dispatch: (a: DeckAction) => void }) {
  const t = resolveDeckTheme(deck.theme ?? undefined);
  const set = (theme: Record<string, string>) => dispatch({ type: "setTheme", theme });
  const colors: Array<[string, string, string]> = [
    ["primaryColor", "Heading colour", t.primaryColor ?? "#4F46E5"],
    ["secondaryColor", "Second colour", t.secondaryColor ?? "#7C3AED"],
    ["accentColor", "Accent colour", t.accentColor ?? "#06B6D4"],
    ["textColor", "Text colour", t.textColor ?? "#0F172A"],
  ];
  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Theme builder" marker="data-deck-theme-builder">
      {colors.map(([key, label, value]) => (
        <Row key={key} label={label}>
          {/* ui-exception: a raw colour value, not user-authored text */}
          <input type="color" aria-label={label} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => set({ [key]: e.target.value })} className="h-7 w-14 rounded border border-border bg-transparent" />
        </Row>
      ))}
      <Row label="Font">
        <Select aria-label="Font" value={(t.font as string) || "sans"} onValueChange={(v) => set({ font: v })} options={FONTS} />
      </Row>
      <Row label="Look">
        <Select aria-label="Look" value={(t.variant as string) || "fancy"} onValueChange={(v) => set({ variant: v })} options={VARIANTS} />
      </Row>
    </Shell>
  );
}

// ── Import slides ───────────────────────────────────────────────────────────

export function ImportSlidesDialog({ open, onOpenChange, dispatch, presentationId }: Common & { dispatch: (a: DeckAction) => void; presentationId: string }) {
  const [busy, setBusy] = useState(false);
  const [decks, setDecks] = useState<Array<{ id: string; name: string }> | null>(null);
  const [slides, setSlides] = useState<DeckSlide[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const finish = (list: DeckSlide[]) => {
    setSlides(list);
    setPicked(new Set(list.map((_, i) => i)));
  };
  const loadDecks = async () => {
    setBusy(true);
    const res = await listAccessiblePresentations();
    setBusy(false);
    if (isServiceFailure(res)) return void toast.error("Could not list presentations", { description: res.error });
    setDecks(res.data.filter((r) => r.id !== presentationId).map((r) => ({ id: r.id, name: r.name })));
  };
  const openDeck = async (id: string) => {
    setBusy(true);
    const res = await getPresentation(id);
    setBusy(false);
    if (isServiceFailure(res)) return void toast.error("Could not open that presentation", { description: res.error });
    finish(res.data.deck.slides);
  };
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const { fileId } = await mediaClient.upload(file, { fileName: file.name, mimeType: file.type, shownTo: "only_me", metadata: { purpose: "presentation_import", presentation_id: presentationId } });
      const ex = await extractOfficeMarkdown(fileId);
      finish(portionsToSlides(ex.portions ?? []));
    } catch (err) {
      toast.error("Could not read that file", { description: err instanceof Error ? err.message : String(err) });
    }
    setBusy(false);
  };
  const close = (v: boolean) => {
    if (!v) {
      setSlides(null);
      setDecks(null);
    }
    onOpenChange(v);
  };
  return (
    <Shell
      open={open}
      onOpenChange={close}
      title="Import slides"
      marker="data-deck-import"
      width="max-w-lg"
      footer={
        slides ? (
          <Button
            variant="primary"
            disabled={picked.size === 0}
            onClick={() => {
              dispatch({ type: "appendSlides", slides: slides.filter((_, i) => picked.has(i)) });
              close(false);
            }}
          >
            Import {picked.size} slide{picked.size === 1 ? "" : "s"}
          </Button>
        ) : undefined
      }
    >
      {!slides ? (
        <>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
              From a PowerPoint file
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void loadDecks()}>
              From a presentation
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void openFile(f); }} />
          {decks ? (
            <ul className="max-h-[40vh] divide-y divide-border overflow-y-auto text-sm">
              {decks.length === 0 ? <li className="py-2 text-muted-foreground">No other presentations</li> : null}
              {decks.map((d) => (
                <li key={d.id}>
                  <button type="button" data-clickable className="w-full py-2 text-left hover:bg-accent" onClick={() => void openDeck(d.id)}>
                    {d.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto text-sm">
          {slides.map((s, i) => (
            <li key={i} className="flex items-center gap-2 py-1.5">
              <input
                type="checkbox"
                aria-label={`Import slide ${i + 1}`}
                checked={picked.has(i)}
                onChange={(e) =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(i);
                    else next.delete(i);
                    return next;
                  })
                }
              />
              <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 truncate">{s.title || s.quote || "Untitled slide"}</span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

// ── Accessibility ───────────────────────────────────────────────────────────

export function AccessibilityDialog({ open, onOpenChange }: Common) {
  const a11y = useDeckA11y();
  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Accessibility" marker="data-deck-a11y">
      <Row label="Announce slide changes to screen readers">
        <Switch aria-label="Announce slide changes" checked={a11y.announceSlides} onCheckedChange={(v) => setDeckA11y({ ...getDeckA11y(), announceSlides: v })} />
      </Row>
      <Row label="Reduce motion in the slideshow">
        <Switch aria-label="Reduce motion" checked={a11y.reduceMotion} onCheckedChange={(v) => setDeckA11y({ ...getDeckA11y(), reduceMotion: v })} />
      </Row>
    </Shell>
  );
}
