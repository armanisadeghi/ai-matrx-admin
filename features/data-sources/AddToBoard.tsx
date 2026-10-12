"use client";

/**
 * "Add to a board" for a fetched table: the person picks WHICH of their boards (never silently the
 * last one opened); the board opens with a Table tile bound to the table (`/board/<id>?add=…` — the
 * board's own add path, `features/board/home/UserBoard.tsx`).
 */

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button, Select } from "@ai-matrx/design-system/controls";

import { addToBoardHref } from "@/features/board/boards/AddToBoardRedirect";
import { beginBoardCreate, isBoardError, listBoards } from "@/features/board/persistence/boardsService";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";

const NONE = "";
const NEW_BOARD = "__new_board__";

export function AddToBoard({ tableId, tableName }: { tableId: string; tableName?: string | null }) {
  const router = useRouter();
  const organizationId = useAppSelector(selectOrganizationId);
  const createNew = async () => {
    try {
      // The canonical create path: the active organization, the table's own name, then the Table tile.
      const { id } = await beginBoardCreate({ organizationId, title: tableName?.trim() || undefined });
      router.push(addToBoardHref(id, "data-table", tableId));
    } catch (error) {
      toast.error(isBoardError(error) ? error.message : "The board could not be created.");
    }
  };
  const boards = useQuery({ queryKey: ["data-sources", "my-boards"], queryFn: () => listBoards("active"), staleTime: 30 * 1000 });
  const list = boards.data ?? [];
  if (boards.isLoading) return <Button variant="outline" disabled icon={<LayoutDashboard className="h-4 w-4" />}>Add to a board</Button>;
  if (list.length === 0) {
    return (
      <Button variant="outline" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => void createNew()}>
        New board
      </Button>
    );
  }
  return (
    <Select
      aria-label="Add to a board"
      icon={<LayoutDashboard className="h-4 w-4" />}
      value={NONE}
      options={[{ value: NONE, label: "Add to a board" }, { value: NEW_BOARD, label: "New board" }, ...list.map((b) => ({ value: b.id, label: b.title }))]}
      onValueChange={(id) => {
        if (id === NEW_BOARD) void createNew();
        else if (id !== NONE) router.push(addToBoardHref(id, "data-table", tableId));
      }}
    />
  );
}
