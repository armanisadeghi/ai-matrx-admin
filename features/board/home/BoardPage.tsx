"use client";

/**
 * BoardPage — the Board: a person's own canvas, the platform's main way in.
 * The ONE chat-beside-a-canvas layout (`ChatCanvasWorkspace`) with the
 * person's saved board as its canvas; the chat beside it is the shell's, with
 * this board's own conversation (`shellChatHome`). The board publishes its
 * own surface (`matrx-user/board`), so no page-level snapshot is passed.
 *
 * Code splitting: the board (engine + every item type's canonical body) is
 * ONE `ssr: false` edge, rendered only once the saved board is ready.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { FilePlus, LayoutGrid, LayoutTemplate, ListTree, Pencil, Plus, Rows3, Shapes } from "lucide-react";
import { ChatCanvasWorkspace } from "@ai-matrx/chat/canvas/workspace/ChatCanvasWorkspace";
import type { CanvasWorkspaceLayout } from "@ai-matrx/chat/canvas/workspace/workspace-cookies";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { TextInputDialog } from "@ai-matrx/design-system";
import { BoardOrganizationProvider } from "../items/board-organization";
import { BoardChatsProvider, BoardHomeChatFiler } from "../items/board-chats";
import { type SavedBoardTarget, useSavedBoard } from "../persistence/useSavedBoard";
import { BOARD_TOKEN, CANVAS_LAYOUT_SETTING, CHAPTER_ORDER_SETTING, LAYOUT_SETTING } from "../persistence/boardsService";
import { usePageFamily } from "../persistence/usePageFamily";
import { type BoardLayoutMode, layoutModeOf, parseCanvasSnapshot, parseChapterOrder } from "../engine/page-layout";
import type { BoardPreset } from "../presets/board-preset";
import { useCreateBoard } from "../persistence/useCreateBoard";
import { listTemplateIds } from "@/features/spaces/state/templates";
import { toast } from "@/lib/toast";
import { BoardTemplateGallery } from "../templates/BoardTemplateGallery";
import { isBoardTemplate, saveBoardAsTemplate } from "../templates/board-templates";

/** The board while it opens: board-shaped placeholders from the first frame, never a line of text. */
function BoardOpening() {
  return (
    <div className="h-full min-h-0 w-full overflow-hidden p-4">
      <RegionSkeleton shape="cards" count={6} aria-label="Opening your board" />
    </div>
  );
}

const loadUserBoard = () => import("./UserBoard").then((m) => m.UserBoard);
// The canvas chunk starts downloading when this page's code arrives, in parallel with the board's own read,
// not after it (the read used to finish first and then wait for the chunk).
if (typeof window !== "undefined") void loadUserBoard();

const UserBoard = dynamic(loadUserBoard, {
  ssr: false,
  loading: () => <BoardOpening />,
});

export function BoardPage({
  target,
  workspaceId,
  initialLayout,
  preset,
  titleMenuExtra,
  hideNewBoard = false,
  displayTitle,
}: {
  target: SavedBoardTarget;
  /** The workspace's remembered layout (the chat's is the shell chat's: `shellChatHome`). */
  workspaceId: string;
  initialLayout: CanvasWorkspaceLayout;
  /** A focus for this board (`presets/`); none = the whole board. */
  preset?: BoardPreset;
  /** Extra items for the board's own title ▾ (a host's boards to switch to). Shown first. */
  titleMenuExtra?: ReactNode;
  /** The host already offers its own "New board" in `titleMenuExtra` (a brand's Studio makes boards linked to the brand): one door, not two. */
  hideNewBoard?: boolean;
  /** How the title reads in the header (a brand's Studio drops the brand it already sits under). The record keeps the full title. */
  displayTitle?: (title: string) => string;
}) {
  const saved = useSavedBoard(target);
  const [renaming, setRenaming] = useState(false);
  const { creating, newBoard } = useCreateBoard();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  // The board templates the person can open (null = not read yet): says whether THIS board is one.
  const [templateIds, setTemplateIds] = useState<string[] | null>(null);

  const ready = saved.state === "ready" ? saved : null;
  const title = ready?.board.title ?? "Board";
  const readyId = ready?.board.id ?? null;
  // Page layout (`settings.layout`) and the canvas it keeps (`settings.canvas_layout`).
  const layout: BoardLayoutMode = layoutModeOf(ready?.board.settings[LAYOUT_SETTING]);
  const canvasLayout = parseCanvasSnapshot(ready?.board.settings[CANVAS_LAYOUT_SETTING]);
  const chapterOrder = parseChapterOrder(ready?.board.settings[CHAPTER_ORDER_SETTING]);
  // The switch itself lives with the board (it keeps the canvas first): `UserBoard` fills this in.
  const layoutSwitch = useRef<((next: BoardLayoutMode) => Promise<void>) | null>(null);
  const setLayout = (next: BoardLayoutMode): Promise<void> => {
    const run = layoutSwitch.current;
    if (!run) return Promise.reject(new Error("The board is still opening."));
    return run(next);
  };
  // The outline: open by default in page layout, a toggle on the canvas (per open board, per layout).
  const [outlinePick, setOutlinePick] = useState<{ key: string; open: boolean } | null>(null);
  const outlineKey = `${readyId ?? ""}|${layout}`;
  // A phone's outline is a drawer over the page: it opens when asked, never by default (it would cover the page).
  const isMobile = useIsMobile();
  const outlineOpen = outlinePick?.key === outlineKey ? outlinePick.open : layout === "page" && !isMobile;
  const setOutlineOpen = (open: boolean) => setOutlinePick({ key: outlineKey, open });
  const family = usePageFamily(
    ready
      ? { id: ready.board.id, title, organizationId: ready.board.organizationId, settings: ready.board.settings, layout }
      : null,
  );
  useEffect(() => {
    if (!readyId) return;
    let live = true;
    listTemplateIds("board").then(
      (ids) => live && setTemplateIds(ids),
      () => live && setTemplateIds([]),
    );
    return () => {
      live = false;
    };
  }, [readyId]);
  const isTemplate = readyId ? isBoardTemplate(templateIds, readyId) : false;
  const toggleTemplate = () => {
    if (!readyId) return;
    const on = !isTemplate;
    saveBoardAsTemplate(readyId, on).then(
      () => {
        setTemplateIds((ids) => (on ? [...(ids ?? []), readyId] : (ids ?? []).filter((x) => x !== readyId)));
        toast.success(on ? "Saved as a template" : "Template label removed");
      },
      (e: unknown) => toast.error(e instanceof Error ? e.message : "The template label could not be changed. Try again."),
    );
  };

  const byline = !ready
    ? undefined
    : ready.saveError
      ? `Not saved: ${ready.saveError}`
      : ready.saving
        ? "Saving…"
        : ready.lastSavedAt
          ? "Saved"
          : undefined;

  return (
    <>
      <ChatCanvasWorkspace
        id={workspaceId}
        title={displayTitle ? displayTitle(title) : title}
        byline={byline}
        initialLayout={initialLayout}
        // Comments on the whole board ("bigger things"); each rides the next message of this chat.
        record={ready ? { resourceId: ready.board.id, resourceName: title, commentToken: BOARD_TOKEN } : undefined}
        titleMenu={
          <>
            {titleMenuExtra}
            {ready && (
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename…
              </DropdownMenuItem>
            )}
            {ready && (
              <DropdownMenuItem onSelect={() => void setLayout(layout === "page" ? "canvas" : "page").catch(() => undefined)}>
                {layout === "page" ? <Shapes className="mr-2 h-4 w-4" /> : <Rows3 className="mr-2 h-4 w-4" />}
                {layout === "page" ? "Canvas layout" : "Page layout"}
              </DropdownMenuItem>
            )}
            {ready && (
              <DropdownMenuItem onSelect={() => setOutlineOpen(!outlineOpen)}>
                <ListTree className="mr-2 h-4 w-4" />
                {outlineOpen ? "Hide outline" : "Show outline"}
              </DropdownMenuItem>
            )}
            {ready && (
              <DropdownMenuItem disabled={family.adding} onSelect={() => void family.addPage().catch(() => undefined)}>
                <FilePlus className="mr-2 h-4 w-4" />
                Add page
              </DropdownMenuItem>
            )}
            {hideNewBoard ? null : (
              <DropdownMenuItem disabled={creating} onSelect={() => void newBoard()}>
                <Plus className="mr-2 h-4 w-4" />
                New board
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setTemplatesOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              New board from template…
            </DropdownMenuItem>
            {ready && (
              <DropdownMenuItem onSelect={toggleTemplate}>
                <LayoutTemplate className="mr-2 h-4 w-4" />
                {isTemplate ? "Remove template label" : "Save as template"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/board">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Boards
              </Link>
            </DropdownMenuItem>
          </>
        }
        canvas={
          <div className="relative h-full min-h-0">
            {saved.state === "loading" && <BoardOpening />}
            {saved.state === "failed" && (
              <BoardMessage>
                <ErrorNotice
                  className="max-w-md"
                  title="Your board could not be opened"
                  message={saved.reason}
                  operation="Open board"
                  calls={["boards"]}
                  actions={<Button variant="primary" onClick={saved.retry}>Try again</Button>}
                />
              </BoardMessage>
            )}
            {ready && (
              <>
                {ready.board.problems.length > 0 && (
                  <ErrorNotice
                    size="compact"
                    className="absolute bottom-16 left-4 z-40 max-w-md"
                    title="Parts of this board could not be read"
                    message={`They were left out: ${ready.board.problems.join("; ")}`}
                    operation="Read board"
                    details={{ problems: ready.board.problems }}
                  />
                )}
                <BoardOrganizationProvider value={ready.board.organizationId}>
                  <BoardChatsProvider key={ready.board.id} boardId={ready.board.id} organizationId={ready.board.organizationId}>
                    <BoardHomeChatFiler />
                    <UserBoard
                      key={ready.board.id}
                      preset={preset}
                      boardId={ready.board.id}
                      title={ready.board.title}
                      doc={ready.board.doc}
                      viewerCamera={ready.board.viewerCamera}
                      onChange={ready.save}
                      onCamera={ready.saveCamera}
                      layout={layout}
                      canvasLayout={canvasLayout}
                      chapterOrder={chapterOrder}
                      saveLayout={(patch) => ready.updateSettings(patch, { optimistic: false })}
                      layoutSwitch={layoutSwitch}
                      outline={{
                        open: outlineOpen,
                        onOpenChange: setOutlineOpen,
                        pages: {
                          list: family.list,
                          currentId: ready.board.id,
                          error: family.error,
                          adding: family.adding,
                          onAdd: () => void family.addPage().catch(() => undefined),
                          onRetry: family.retry,
                        },
                      }}
                      pagesHost={{
                        layout,
                        pages: (family.list ?? []).map((p) => ({
                          id: p.id,
                          title: p.title,
                          parent_id: p.parentId,
                          current: p.id === ready.board.id,
                        })),
                        setLayout,
                        addPage: family.addPage,
                      }}
                    />
                  </BoardChatsProvider>
                </BoardOrganizationProvider>
              </>
            )}
          </div>
        }
      />
      <BoardTemplateGallery open={templatesOpen} onOpenChange={setTemplatesOpen} initialKey={preset && typeof preset.starter === "string" ? preset.starter : undefined} />
      {ready && (
        <TextInputDialog
          open={renaming}
          onOpenChange={setRenaming}
          title="Rename board"
          defaultValue={ready.board.title}
          confirmLabel="Rename"
          onConfirm={(value) => {
            ready.rename(value);
            setRenaming(false);
          }}
        />
      )}
    </>
  );
}

function BoardMessage({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6">{children}</div>;
}
