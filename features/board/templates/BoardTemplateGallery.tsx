"use client";

// The board template picker: the shared gallery frame (spaces/sidebar/TemplateGalleryShell) with board
// entries - built-ins from code, then the person's saved templates - and a layout sketch for the preview.
// "Use template" makes a new board (duplicateBoard / the built-in's document) and opens it.

import { LayoutTemplate, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TemplateGalleryShell, type TemplateEntry } from "@/features/spaces/sidebar/TemplateGalleryShell";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { toast } from "@/lib/toast";
import { boardHref, isBoardError } from "../persistence/boardsService";
import { BoardSketch } from "./BoardSketch";
import { listBoardTemplates, makeBoardFromTemplate, templateBoardTitle, type BoardTemplateEntry } from "./board-templates";
import { isPackKey } from "./board-packs";
import { TextInputDialog } from "@ai-matrx/design-system";
import { BUILTIN_BOARD_TEMPLATES } from "./builtin";
import { openFromNotice } from "@/lib/notice-open/openFromNotice";
import { DesignBoardStartDialog } from "./design-start";
import { stashBoardStart, type BoardStartChoice } from "./open-design-build";

export function BoardTemplateGallery({
  open,
  onOpenChange,
  initialKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The template to show first (a preset's starter). */
  initialKey?: string;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const organizationId = useAppSelector(selectOrganizationId); // org-filter: write-target installing a board template writes into the selected organization
  const [saved, setSaved] = useState<BoardTemplateEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>(initialKey ?? BUILTIN_BOARD_TEMPLATES[0].key);
  const [using, setUsing] = useState(false);
  const [stage, setStage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    listBoardTemplates().then(
      (all) => live && (setSaved(all), setError(null)),
      (e: unknown) => live && setError(e instanceof Error ? e.message : "We couldn't list board templates."),
    );
    return () => {
      live = false;
    };
  }, [open]);

  // Until the read lands the built-ins are already usable (they need no read).
  const all = saved ?? BUILTIN_BOARD_TEMPLATES.map((t) => ({ key: t.key, title: t.title, builtin: true, doc: t.build() }));
  const current = all.find((t) => t.key === picked) ?? all[0] ?? null;
  const entries: TemplateEntry[] = all.map((t) => ({
    key: t.key,
    title: t.title,
    icon: t.builtin ? <Sparkles size={16} /> : <LayoutTemplate size={16} />,
  }));

  // A template that makes its own tables (a design system per brand) is named first: the name titles the
  // board and its tables ("Colors · Acme"), so two brands' boards never read alike.
  const [naming, setNaming] = useState(false);
  // A board that starts EMPTY opens on its two starts instead: Build with AI (default) or Start from a style.
  const [starting, setStarting] = useState(false);
  const use = async (name?: string, start?: BoardStartChoice) => {
    if (!current) return;
    if (name === undefined && isPackKey(current.key)) {
      if ("startsEmpty" in current && current.startsEmpty) setStarting(true);
      else setNaming(true);
      return;
    }
    setUsing(true);
    try {
      const styleTemplateId = start?.mode === "style" ? start.styleTemplateId : undefined;
      const board = await makeBoardFromTemplate(current.key, organizationId, name?.trim() || templateBoardTitle(current.title), undefined, undefined, { dispatch, onStage: setStage, styleTemplateId });
      if (start) stashBoardStart(board.id, start.mode === "ai" ? { mode: "ai", brief: start.brief } : { mode: "style", styleName: start.styleName });
      // A stale toast ("Saved as a template") must not sit over the new board; the new one carries Open
      // in case the navigation is slow or blocked.
      toast.dismiss();
      onOpenChange(false);
      const href = boardHref(board);
      toast.success(`Made "${board.title}"`, { action: { label: "Open", onClick: () => openFromNotice(href) } });
      router.push(href);
    } catch (e) {
      toast.error(isBoardError(e) ? e.message : e instanceof Error ? e.message : "The template could not be used. Try again.");
    } finally {
      setUsing(false);
      setStage(null);
    }
  };

  return (
    <>
    <TemplateGalleryShell
      open={open}
      onOpenChange={onOpenChange}
      heading="Board templates"
      entries={entries}
      loading={saved === null && !error}
      error={error}
      picked={current?.key ?? picked}
      onPick={setPicked}
      previewTitle={stage ?? current?.title ?? null}
      previewLoading={false}
      preview={current ? <BoardSketch doc={current.doc} /> : null}
      usable={!!current}
      using={using}
      onUse={() => void use()}
    />
    <DesignBoardStartDialog
      open={starting}
      onOpenChange={setStarting}
      packKey={current?.key ?? null}
      defaultName={current?.title ?? ""}
      onStart={(choice) => {
        setStarting(false);
        void use(choice.name, choice);
      }}
    />
    <TextInputDialog
      open={naming}
      onOpenChange={setNaming}
      title="Name this board"
      description="Its tables take the same name."
      placeholder="e.g. Acme design system"
      defaultValue={current?.title ?? ""}
      confirmLabel="Make board"
      validate={(value) => (value.trim() ? null : "Name the board")}
      onConfirm={(value: string) => {
        setNaming(false);
        void use(value);
      }}
    />
    </>
  );
}
