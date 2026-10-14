"use client";

/**
 * "Add to a board" for a fetched table: the person picks WHICH of their boards (never silently the
 * last one opened); the board opens with a Table tile bound to the table (`/board/<id>?add=…` — the
 * board's own add path, `features/board/home/UserBoard.tsx`).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button, OptionCombobox } from "@ai-matrx/design-system/controls";

import { addToBoardHref } from "@/features/board/boards/AddToBoardRedirect";
import { beginBoardCreate, isBoardError, listBoards } from "@/features/board/persistence/boardsService";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";

import { boardChoices } from "./boardChoices";

const NEW_BOARD = "__new_board__";
export function AddToBoard({ tableId, tableName }: { tableId: string; tableName?: string | null }) {
  const router = useRouter();
  const organizationId = useAppSelector(selectOrganizationId); // org-filter: write-target adding data writes a tile into the selected organization
  const [busy, setBusy] = useState(false);
  // Where the person is being taken: shown as a REAL link while the route compiles, so a slow first load never leaves a dead button.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const boards = useQuery({ queryKey: ["data-sources", "my-boards"], queryFn: () => listBoards("active"), staleTime: 30 * 1000 });
  const list = useMemo(() => boards.data ?? [], [boards.data]);
  const choices = useMemo(() => boardChoices(list), [list]);
  const titles = useMemo(() => new Map(list.map((b) => [b.id, b.title || "Untitled board"])), [list]);

  const open = (id: string) => {
    const href = addToBoardHref(id, "data-table", tableId);
    setPendingHref(href);
    router.push(href);
  };
  const prefetch = (id: string) => router.prefetch(addToBoardHref(id, "data-table", tableId));
  const createNew = async () => {
    setBusy(true);
    try {
      // The canonical create path: the active organization, the table's own name, then the Table tile.
      const title = tableName?.trim() || undefined;
      const { id } = await beginBoardCreate({ organizationId, title });
      prefetch(id);
      toast.success(`New board "${title ?? "Untitled board"}" is ready`, { action: { label: "Open board", onClick: () => open(id) } });
      open(id);
    } catch (error) {
      toast.error(isBoardError(error) ? error.message : "The board could not be created.");
      setBusy(false);
    }
  };
  const pick = (id: string) => {
    if (id === NEW_BOARD) void createNew();
    else if (id) {
      setBusy(true);
      prefetch(id);
      toast.success(`Adding to "${titles.get(id) ?? "your board"}"`, { action: { label: "Open board", onClick: () => open(id) } });
      open(id);
    }
  };

  if (busy && pendingHref) {
    return (
      <Link
        href={pendingHref}
        prefetch
        data-open-board=""
        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-foreground hover:bg-accent"
      >
        <LayoutDashboard className="h-4 w-4" />
        Open board
      </Link>
    );
  }
  if (boards.isLoading || busy) {
    return (
      <Button variant="outline" disabled icon={<LayoutDashboard className="h-4 w-4" />}>
        {busy ? "Opening board" : "Add to a board"}
      </Button>
    );
  }
  if (list.length === 0) {
    return (
      <Button variant="outline" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => void createNew()}>
        New board
      </Button>
    );
  }
  return (
    <div data-add-to-board="">
      <OptionCombobox
        ariaLabel="Add to a board"
        value=""
        placeholder="Add to a board"
        searchPlaceholder="Find a board"
        onChange={pick}
        getLabel={(id) => (id === NEW_BOARD ? "New board" : (titles.get(id) ?? id))}
        groups={[
          { options: [NEW_BOARD] },
          { heading: "Recent", options: choices.recent.map((b) => b.id) },
          ...(choices.more.length > 0 ? [{ heading: "Older", options: choices.more.map((b) => b.id), collapsed: true }] : []),
        ]}
      />
    </div>
  );
}
