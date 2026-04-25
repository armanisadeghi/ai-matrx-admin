/**
 * features/files/components/core/FileTree/FileTree.tsx
 *
 * VS Code-style file tree. Virtualized (handles 10k+ rows), keyboard
 * navigable (↑/↓/←/→/Enter), supports drag-and-drop moves via dnd-kit.
 *
 * Used by the PageShell sidebar, the WindowPanelShell sidebar, and inside
 * FilePicker. Mobile surfaces use a different rendering (push-nav) — do not
 * import FileTree on mobile.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { moveFile } from "@/features/files/redux/thunks";
import { useFileSelection } from "@/features/files/hooks/useFileSelection";
import {
  FILE_TREE_ROW_HEIGHT,
  FileTreeRow,
} from "./FileTreeRow";
import { useTreeExpansion } from "./useTreeExpansion";
import type { TreeRow } from "./useTreeExpansion";

export interface FileTreeProps {
  /** Called when a row (file or folder) is activated (Enter / double-click). */
  onActivateFile?: (fileId: string) => void;
  onActivateFolder?: (folderId: string) => void;
  /** Click handlers — called after selection updates. */
  onSelectFile?: (fileId: string) => void;
  onSelectFolder?: (folderId: string) => void;
  onRenameRequest?: (fileId: string) => void;
  onShareRequest?: (fileId: string) => void;
  onMoveRequest?: (fileId: string) => void;
  className?: string;
  /** Initial expanded folder IDs. */
  initialExpanded?: string[];
  /** Disable drag-and-drop moves (read-only contexts). */
  readOnly?: boolean;
  /** Optional empty-state content. */
  emptyState?: React.ReactNode;
}

export function FileTree({
  onActivateFile,
  onActivateFolder,
  onSelectFile,
  onSelectFolder,
  onRenameRequest,
  onShareRequest,
  onMoveRequest,
  className,
  initialExpanded,
  readOnly,
  emptyState,
}: FileTreeProps) {
  const dispatch = useAppDispatch();
  const selection = useFileSelection();
  const expansion = useTreeExpansion({ initialExpanded });
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const rows = expansion.rows;
  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => FILE_TREE_ROW_HEIGHT,
    overscan: 12,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // ------------------------------------------------------------------- events

  const handleRowClick = useCallback(
    (row: TreeRow, index: number, event: React.MouseEvent) => {
      selection.handleClick(row.id, event, rowIds);
      setFocusedIndex(index);
      if (row.kind === "file") {
        onSelectFile?.(row.id);
      } else {
        onSelectFolder?.(row.id);
      }
    },
    [selection, rowIds, onSelectFile, onSelectFolder],
  );

  const handleRowDoubleClick = useCallback(
    (row: TreeRow) => {
      if (row.kind === "folder") {
        expansion.toggle(row.id);
        onActivateFolder?.(row.id);
      } else {
        onActivateFile?.(row.id);
      }
    },
    [expansion, onActivateFile, onActivateFolder],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (rows.length === 0) return;
      const row = rows[focusedIndex] ?? rows[0];
      const idx = rows.indexOf(row);

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const next = Math.min(rows.length - 1, idx + 1);
          setFocusedIndex(next);
          virtualizer.scrollToIndex(next, { align: "auto" });
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          const prev = Math.max(0, idx - 1);
          setFocusedIndex(prev);
          virtualizer.scrollToIndex(prev, { align: "auto" });
          break;
        }
        case "ArrowRight": {
          event.preventDefault();
          if (row.kind === "folder" && !row.expanded && !row.empty) {
            expansion.expand(row.id);
          } else if (row.kind === "folder" && row.expanded) {
            // Step into first child.
            const next = Math.min(rows.length - 1, idx + 1);
            setFocusedIndex(next);
          }
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (row.kind === "folder" && row.expanded) {
            expansion.collapse(row.id);
          } else if (row.parentId) {
            const parentIdx = rows.findIndex(
              (r) => r.id === row.parentId && r.kind === "folder",
            );
            if (parentIdx >= 0) setFocusedIndex(parentIdx);
          }
          break;
        }
        case "Enter": {
          event.preventDefault();
          if (row.kind === "folder") {
            expansion.toggle(row.id);
            onActivateFolder?.(row.id);
          } else {
            onActivateFile?.(row.id);
          }
          break;
        }
        default:
          break;
      }
    },
    [rows, focusedIndex, expansion, virtualizer, onActivateFile, onActivateFolder],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = (event.active.data.current as { id?: string } | undefined)?.id;
    if (id) setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null);
      const over = event.over?.data.current as
        | { type?: "file" | "folder"; id?: string }
        | undefined;
      const active = event.active.data.current as
        | { type?: "file" | "folder"; id?: string }
        | undefined;
      if (!over || over.type !== "folder" || !over.id || !active?.id) return;
      if (active.type !== "file") return; // only file → folder for now
      if (active.id === over.id) return;

      void dispatch(
        moveFile({ fileId: active.id, newParentFolderId: over.id }),
      );
    },
    [dispatch],
  );

  // Keep focus in bounds if rows shrink.
  useEffect(() => {
    if (focusedIndex >= rows.length) {
      setFocusedIndex(rows.length ? rows.length - 1 : -1);
    }
  }, [rows.length, focusedIndex]);

  const virtualItems = virtualizer.getVirtualItems();

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "h-full w-full flex items-center justify-center text-xs text-muted-foreground p-4",
          className,
        )}
      >
        {emptyState ?? "No files yet."}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        role="tree"
        tabIndex={0}
        aria-multiselectable="true"
        onKeyDown={handleKeyDown}
        className={cn(
          "h-full w-full overflow-auto outline-none",
          readOnly && "opacity-90 cursor-default",
          className,
        )}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
          }}
        >
          {virtualItems.map((vItem) => {
            const row = rows[vItem.index];
            if (!row) return null;
            return (
              <div
                key={row.id}
                data-index={vItem.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                <FileTreeRow
                  row={row}
                  selected={selection.isSelected(row.id)}
                  focused={focusedIndex === vItem.index}
                  dragDisabled={readOnly}
                  isDragging={draggingId === row.id}
                  onClick={(e) => handleRowClick(row, vItem.index, e)}
                  onChevronClick={() => expansion.toggle(row.id)}
                  onDoubleClick={() => handleRowDoubleClick(row)}
                  onRename={
                    onRenameRequest
                      ? () => onRenameRequest(row.id)
                      : undefined
                  }
                  onShare={
                    onShareRequest ? () => onShareRequest(row.id) : undefined
                  }
                  onMove={
                    onMoveRequest ? () => onMoveRequest(row.id) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {draggingId ? (
          <div className="rounded border bg-card px-2 py-1 text-xs shadow-md">
            Moving…
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
