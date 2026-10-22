"use client";

/**
 * THE COVER — a board's opening: a rendered HERO (written HTML: a wordmark, a tagline, a graphic)
 * above rendered PROSE (markdown through the one markdown pipeline, read mode). Board-only content,
 * kept on the tile's source (`{ kind: "entity", entity: "cover", id: null, meta: { hero, markdown } }`),
 * so it saves with the board and copies with a template; an agent writes the same two strings.
 *
 * Read first. "Edit" in the tile's one "…" menu (or a press on the prose while the tile is open for work) shows the prose in
 * the writing box and the hero's HTML source beneath it, each drawn live; Done or Escape returns to
 * the rendered cover. The hero is drawn by records-ui's seamless frame (`/html-frame`): sandboxed
 * markup and CSS only, transparent, as tall as its content, with the theme's tokens as CSS variables.
 * The tile is auto-height in page layout (no inner scroll) and names itself (no header bar).
 * Comments: none of its own, so the tile's comment door posts on the board's thread.
 */

import { useContext, useEffect, useState } from "react";
import { LayoutTemplate, Pencil } from "lucide-react";
import { HtmlSampleFrame, TokenScope } from "@ai-matrx/records-ui/html-frame";
import { Button, Textarea } from "@ai-matrx/design-system/controls";
import { ShimmerText } from "@ai-matrx/design-system";
import { ProTextarea } from "@/components/official/ProTextarea";
import type { NodeSource } from "../board/document";
import type { BoardItemType, ItemBodyProps, TileMenuAction, TileMenuContext } from "./types";
import { BoardCameraStoreContext } from "../engine/react";
import { FaceLine, faceCopy } from "./face-text";
import { MarkdownTileBody } from "../tiles/MarkdownTileBody";
import { COVER_ENTITY, coverOf, coverSource, type CoverContent } from "./cover-source";
import { CoverStructure } from "./structures";
import { useBoardTokenTables } from "./board-token-tables";
import { startDesignBuild, useDesignBuildRunning } from "../templates/board-start";

export { COVER_ENTITY, coverOf, coverSource, type CoverContent } from "./cover-source";

const DRAW_AFTER_MS = 250;

/** "Edit" from the tile's menu reaches the cover body showing that tile (the menu holds no component). */
const editRequests = new Map<string, Set<() => void>>();

export function requestCoverEdit(tileId: string): void {
  for (const open of editRequests.get(tileId) ?? []) open();
}

function onCoverEditRequest(tileId: string, open: () => void): () => void {
  const set = editRequests.get(tileId) ?? new Set<() => void>();
  set.add(open);
  editRequests.set(tileId, set);
  return () => {
    set.delete(open);
    if (set.size === 0) editRequests.delete(tileId);
  };
}

/** The cover's own entry in the tile's one "…" menu. */
export function coverMenuActions({ tileId }: TileMenuContext): TileMenuAction[] {
  return [{ key: "edit", label: "Edit", icon: Pencil, onSelect: () => requestCoverEdit(tileId) }];
}

function CoverBody({ tileId, source, onSource, title, interacting, tier }: ItemBodyProps) {
  const cover = coverOf(source);
  const store = useContext(BoardCameraStoreContext);
  const [editing, setEditing] = useState(false);

  // The menu's Edit opens the writing box and gives the tile the input, so the box takes typing at once.
  useEffect(
    () =>
      onCoverEditRequest(tileId, () => {
        setEditing(true);
        store?.setEditing(tileId);
      }),
    [tileId, store],
  );
  const [draft, setDraft] = useState<CoverContent>(() => cover ?? { hero: "", markdown: "" });
  const [drawn, setDrawn] = useState<CoverContent>(draft);

  // A change from outside (an agent, another tab) while reading is shown (adjusted during render).
  const heroNow = cover?.hero ?? "";
  const markdownNow = cover?.markdown ?? "";
  const [seen, setSeen] = useState({ hero: heroNow, markdown: markdownNow });
  if (!editing && (seen.hero !== heroNow || seen.markdown !== markdownNow)) {
    const now = { hero: heroNow, markdown: markdownNow };
    setSeen(now);
    setDraft(now);
    setDrawn(now);
  }

  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(() => setDrawn(draft), DRAW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [draft, editing]);

  if (!cover) return null;

  const write = (next: CoverContent) => {
    setDraft(next);
    onSource(coverSource(next), title);
  };
  const done = () => {
    setDrawn(draft);
    setEditing(false);
  };
  const escapeReturns = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      done();
    }
  };

  const hero = drawn.hero.trim() ? <HtmlSampleFrame html={drawn.hero} title={`${title} cover`} initialHeight={160} /> : null;
  const prose = drawn.markdown.trim() ? (
    // The board's one prose renderer (the write-up's), at its content's height, in the BOARD's own colors and
    // body font (TokenScope reads the board's token tables), like the hero above it.
    // The board's own ground behind its prose (TokenScope paints it), inset so text never touches its edge.
    <TokenScope className="rounded-lg px-4 py-3">
      <MarkdownTileBody id={`${tileId}-prose`} text={drawn.markdown} tier={tier} fit />
    </TokenScope>
  ) : null;

  if (!editing) {
    return (
      <article data-board-cover="" className="flex flex-col gap-6 rounded-xl bg-card px-10 py-10">
        {hero}
        {prose ? (
          <div
            data-board-cover-prose=""
            onClick={() => {
              if (interacting) setEditing(true);
            }}
            className="mx-auto w-full max-w-[720px]"
          >
            {prose}
          </div>
        ) : null}
        {!hero && !prose ? <EmptyCover /> : null}
      </article>
    );
  }

  return (
    <article data-board-cover="" data-board-cover-editing="" className="flex flex-col gap-4 rounded-xl bg-card px-10 py-8">
      {hero}
      <ProTextarea
        aria-label="Cover text"
        value={draft.markdown}
        autoGrow
        minHeight={160}
        onChange={(e) => write({ ...draft, markdown: e.target.value })}
        onKeyDown={escapeReturns}
        surfaceName="matrx-user/board"
      />
      {/* ui-exception: the hero's raw HTML source, a code value */}
      <Textarea
        aria-label="Cover hero HTML"
        value={draft.hero}
        rows={Math.min(16, Math.max(5, draft.hero.split("\n").length + 1))}
        spellCheck={false}
        mono
        onChange={(e) => write({ ...draft, hero: e.target.value })}
        onKeyDown={escapeReturns}
      />
      <div className="flex justify-end">
        <Button variant="primary" onClick={done}>
          Done
        </Button>
      </div>
    </article>
  );
}

/** The cover at far zoom: its first words. */
function CoverFace({ source }: { source: NodeSource }) {
  const { text, muted } = faceCopy("write-up", coverOf(source)?.markdown ?? null, true);
  return <FaceLine icon={LayoutTemplate} text={text} muted={muted} />;
}

export const COVER_ITEMS: BoardItemType[] = [
  {
    key: COVER_ENTITY,
    guestSafe: true,
    surface: { none: "Board-only content: the board's own tools (board_update_tile) edit it." },
    comments: null,
    label: "Cover",
    icon: LayoutTemplate,
    group: "content",
    section: "notes",
    accent: "indigo",
    structure: CoverStructure,
    status: { none: "A cover is board content; it saves with the board." },
    defaultSize: { w: 1020, h: 900 },
    matches: (s) => s.kind === "entity" && s.entity === COVER_ENTITY,
    Body: CoverBody,
    Face: CoverFace,
    menuActions: coverMenuActions,
    autoHeight: () => true,
    namesItself: () => true,
    startNew: {
      label: "Cover",
      create: () => ({ title: "Cover", source: coverSource({ hero: "", markdown: "# Title\n\nWhat this board is for." }) }),
      openAtOnce: true,
    },
    kindLabel: "cover",
  },
];

/**
 * An empty cover on a design-system board says what is really happening: "building" only while the design job runs
 * in the side chat (it starts on its own, `useBoardStartRun`); once no run is active and the cover is still empty,
 * it says so and offers the job again (a way out after a stopped or failed run, never a first-start step).
 */
function EmptyCover() {
  const designBoard = useBoardTokenTables().length > 0;
  const building = useDesignBuildRunning();
  if (!designBoard) return <p className="py-6 text-center text-sm text-muted-foreground">Empty cover</p>;
  if (building) {
    return (
      <div data-board-cover-empty="" data-board-cover-building="" className="flex flex-col items-center gap-3 py-6">
        <ShimmerText text="The design agent is building this system…" className="text-sm" />
      </div>
    );
  }
  return (
    <div data-board-cover-empty="" data-board-cover-not-built="" className="flex flex-col items-center gap-3 py-6">
      <p className="text-sm text-muted-foreground">Not built yet</p>
      <Button variant="primary" onClick={() => startDesignBuild()}>
        Build it
      </Button>
    </div>
  );
}
