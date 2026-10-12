"use client";

/**
 * "Add to a board" for a fetched table: the person picks WHICH of their boards (never silently the
 * last one opened); the board opens with a Table tile bound to the table (`/board/<id>?add=…` — the
 * board's own add path, `features/board/home/UserBoard.tsx`).
 */

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { Button, Select } from "@ai-matrx/design-system/controls";

import { addToBoardHref } from "@/features/board/boards/AddToBoardRedirect";
import { listBoards } from "@/features/board/persistence/boardsService";

const NONE = "";

export function AddToBoard({ tableId }: { tableId: string }) {
  const router = useRouter();
  const boards = useQuery({ queryKey: ["data-sources", "my-boards"], queryFn: () => listBoards("active"), staleTime: 30 * 1000 });
  const list = boards.data ?? [];
  if (boards.isLoading) return <Button variant="outline" disabled icon={<LayoutDashboard className="h-4 w-4" />}>Add to a board</Button>;
  if (list.length === 0) {
    return (
      <Button variant="outline" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => router.push("/board")}>
        Make a board
      </Button>
    );
  }
  return (
    <Select
      aria-label="Add to a board"
      icon={<LayoutDashboard className="h-4 w-4" />}
      value={NONE}
      options={[{ value: NONE, label: "Add to a board" }, ...list.map((b) => ({ value: b.id, label: b.title }))]}
      onValueChange={(id) => {
        if (id !== NONE) router.push(addToBoardHref(id, "data-table", tableId));
      }}
    />
  );
}
