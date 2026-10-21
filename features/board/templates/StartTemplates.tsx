"use client";

// "Start from a template" for the empty board's Start panel: the preset's starter first (if it names one),
// then the other built-ins, and a link to the whole gallery. Using one makes a NEW board from the template
// and opens it (Use = duplicateBoard / the built-in's document), the same door as the gallery.

import { LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { toast } from "@/lib/toast";
import { boardHref, isBoardError } from "../persistence/boardsService";
import { BoardTemplateGallery } from "./BoardTemplateGallery";
import { makeBoardFromTemplate, templateBoardTitle } from "./board-templates";
import { BUILTIN_BOARD_TEMPLATES } from "./builtin";
import { isPackKey, listBoardPacks } from "./board-packs";
import { TextInputDialog } from "@ai-matrx/design-system";
import { DesignBoardStartDialog } from "./design-start";
import { stashBoardStart, type BoardStartChoice } from "./open-design-build";

/** Built-ins with the starter (when it names one) first. Exported for the test. */
export function orderedStarters(starterKey: string | undefined) {
  return [...BUILTIN_BOARD_TEMPLATES].sort((a, b) => Number(b.key === starterKey) - Number(a.key === starterKey));
}

export function StartTemplates({ starterKey }: { starterKey?: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const organizationId = useAppSelector(selectOrganizationId);
  const [busy, setBusy] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  // The published board packs (Design system, …) sit after the built-ins; a failed read leaves the built-ins and says so.
  const [packs, setPacks] = useState<Array<{ key: string; title: string; summary: string; startsEmpty: boolean }>>([]);
  useEffect(() => {
    let live = true;
    listBoardPacks().then(
      (all) => live && setPacks(all.map(({ key, title, summary, startsEmpty }) => ({ key, title, summary, startsEmpty }))),
      (e: unknown) => live && toast.error(e instanceof Error ? e.message : "We couldn't list the board templates."),
    );
    return () => {
      live = false;
    };
  }, []);

  // A template that makes its own tables is named first (the name titles the board and its tables).
  const [naming, setNaming] = useState<{ key: string; title: string } | null>(null);
  // A board that starts EMPTY opens on its two starts instead: Build with AI (default) or Start from a style.
  const [starting, setStarting] = useState<{ key: string; title: string } | null>(null);
  const use = async (key: string, title: string, name?: string, start?: BoardStartChoice) => {
    if (name === undefined && isPackKey(key)) {
      if (packs.find((p) => p.key === key)?.startsEmpty) setStarting({ key, title });
      else setNaming({ key, title });
      return;
    }
    setBusy(key);
    try {
      const styleTemplateId = start?.mode === "style" ? start.styleTemplateId : undefined;
      const board = await makeBoardFromTemplate(key, organizationId, name?.trim() || templateBoardTitle(title), undefined, undefined, { dispatch, styleTemplateId });
      if (start) stashBoardStart(board.id, start.mode === "ai" ? { mode: "ai", brief: start.brief } : { mode: "style", styleName: start.styleName });
      router.push(boardHref(board));
    } catch (e) {
      toast.error(isBoardError(e) ? e.message : e instanceof Error ? e.message : "The template could not be used. Try again.");
      setBusy(null);
    }
  };

  return (
    <>
      <DesignBoardStartDialog
        open={starting !== null}
        onOpenChange={(open) => {
          if (!open) setStarting(null);
        }}
        packKey={starting?.key ?? null}
        defaultName={starting?.title ?? ""}
        onStart={(choice) => {
          const picked = starting;
          setStarting(null);
          if (picked) void use(picked.key, picked.title, choice.name, choice);
        }}
      />
      <TextInputDialog
        open={naming !== null}
        onOpenChange={(open) => {
          if (!open) setNaming(null);
        }}
        title="Name this board"
        description="Its tables take the same name."
        placeholder="e.g. Acme design system"
        defaultValue={naming?.title ?? ""}
        confirmLabel="Make board"
        validate={(value) => (value.trim() ? null : "Name the board")}
        onConfirm={(value: string) => {
          const picked = naming;
          setNaming(null);
          if (picked) void use(picked.key, picked.title, value);
        }}
      />
      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start from a template</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {[...orderedStarters(starterKey), ...packs].map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={busy !== null}
            title={t.summary}
            onClick={() => void use(t.key, t.title)}
            className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-60"
          >
            <LayoutTemplate className="h-4 w-4 text-primary" />
            {busy === t.key ? "Making your board…" : t.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5"
        >
          <LayoutTemplate className="h-4 w-4" />
          All templates
        </button>
      </div>
      <BoardTemplateGallery open={galleryOpen} onOpenChange={setGalleryOpen} initialKey={starterKey} />
    </>
  );
}
