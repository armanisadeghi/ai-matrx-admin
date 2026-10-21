"use client";

// ArrangeTree — the person's menu as it will look: drag a row before/after any row or onto a group to
// nest it (promote = drop it at the top level), rename and re-icon in place, and the same moves from each
// row's menu for keyboard and touch. Every edit is a pure verb from ./tree.ts; this file only draws.
// Groups start closed (the default Sidebar is ~350 rows; drawing them all made the editor take seconds to
// open); a drop into a group opens it, so the moved row is in sight.
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  ChevronRight,
  FolderInput,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DragCursorMonitor,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  cn,
} from "@ai-matrx/design-system";
import { Button, Field } from "@ai-matrx/design-system/controls";
import { TREE_INDENT_PX, TreeDisclosure, treeIndentStyle } from "@/components/official/topic-tree/geometry";
import ShellIcon from "@/features/shell/components/ShellIcon";
import { getCatalogEntry } from "../catalog";
import type { ShellNode } from "../contract";
import { IconPicker } from "./IconPicker";
import { rowIcon, rowLabel } from "./rowDisplay";
import {
  canMove,
  childrenOf,
  containersFor,
  isContainer,
  moveNode,
  nudgeNode,
  removeNode,
  updateNode,
  type DropTarget,
  type TreeRegion,
} from "./tree";

const KIND_WORD: Partial<Record<ShellNode["kind"], string>> = { link: "Link", record: "Record", launchpad: "Launchpad", group: "Group" };

interface Props {
  nodes: ShellNode[];
  region: TreeRegion;
  onChange: (next: ShellNode[]) => void;
}

const TOP_DROP_ID = "__top__";

export function ArrangeTree({ nodes, region, onChange }: Props) {
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));

  const zoneFor = (event: DragMoveEvent): DropTarget | null => {
    const over = event.over;
    if (!over) return null;
    if (over.id === TOP_DROP_ID) return { kind: "top" };
    const start = event.activatorEvent as PointerEvent | TouchEvent;
    const startY = "touches" in start ? (start.touches[0]?.clientY ?? 0) : start.clientY;
    const y = startY + event.delta.y;
    const rect = over.rect;
    const ratio = (y - rect.top) / Math.max(rect.height, 1);
    const id = String(over.id);
    const host = findNode(nodes, id);
    const nests = region === "sidebar" && host !== null && (isContainer(host) || host.kind === "group");
    const zone: DropTarget = nests && ratio > 0.3 && ratio < 0.7 ? { kind: "inside", id } : { kind: ratio < 0.5 ? "before" : "after", id };
    return canMove(nodes, String(event.active.id), zone, region) ? zone : null;
  };

  const onDragEnd = (event: DragEndEvent) => {
    const zone = target;
    setTarget(null);
    setDragging(null);
    if (!zone) return;
    const next = moveNode(nodes, String(event.active.id), zone, region);
    if (!next) return;
    if (zone.kind === "inside") setOpenIds((prev) => new Set(prev).add(zone.id));
    onChange(next);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e) => setDragging(String(e.active.id))}
      onDragMove={(e) => setTarget(zoneFor(e))}
      onDragCancel={() => {
        setTarget(null);
        setDragging(null);
      }}
      onDragEnd={onDragEnd}
    >
      <DragCursorMonitor />
      <ul className="flex flex-col py-1" aria-label={region === "dock" ? "Your dock" : "Your sidebar"}>
        {nodes.map((node) => (
          <Row key={node.id} node={node} depth={1} all={nodes} region={region} target={target} dragging={dragging} onChange={onChange} openIds={openIds} onToggle={toggle} />
        ))}
      </ul>
      {region === "sidebar" && dragging ? <TopDrop active={target?.kind === "top"} /> : null}
    </DndContext>
  );
}

function findNode(nodes: readonly ShellNode[], id: string): ShellNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(childrenOf(node) ?? [], id);
    if (found) return found;
  }
  return null;
}

function TopDrop({ active }: { active: boolean }) {
  const { setNodeRef } = useDroppable({ id: TOP_DROP_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mx-2 mb-2 flex h-9 items-center justify-center rounded-md border border-dashed border-border type-secondary text-muted-foreground",
        active && "border-primary bg-accent text-foreground",
      )}
    >
      Top level
    </div>
  );
}

interface RowProps {
  node: ShellNode;
  depth: number;
  all: ShellNode[];
  region: TreeRegion;
  target: DropTarget | null;
  dragging: string | null;
  onChange: (next: ShellNode[]) => void;
  openIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

function Row({ node, depth, all, region, target, dragging, onChange, openIds, onToggle }: RowProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const drag = useDraggable({ id: node.id });
  const drop = useDroppable({ id: node.id });
  const children = childrenOf(node);
  const hasChildren = (children?.length ?? 0) > 0;
  const open = openIds.has(node.id);
  const mark = target && target.kind !== "top" && target.id === node.id ? target.kind : null;
  const label = rowLabel(node);
  const icon = rowIcon(node);
  const into = containersFor(all, node.id, region);
  const kindWord = KIND_WORD[node.kind];
  const custom = node.kind === "nav" && node.label !== undefined;

  const commitRename = () => {
    setRenaming(false);
    onChange(updateNode(all, node.id, { label: draft }));
  };

  return (
    <li className={cn(dragging === node.id && "opacity-50")}>
      <div
        ref={(el) => {
          drop.setNodeRef(el);
          drag.setNodeRef(el);
        }}
        className={cn(
          "group relative flex min-h-9 items-center gap-1 rounded-md pr-1 hover:bg-accent",
          mark === "inside" && "bg-accent ring-1 ring-primary",
        )}
        style={treeIndentStyle(depth - 1)}
        data-layout-row={node.id}
      >
        {mark === "before" ? <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-primary" /> : null}
        {mark === "after" ? <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-primary" /> : null}
        <span
          {...drag.listeners}
          {...drag.attributes}
          aria-label={`Drag ${label}`}
          className="flex h-7 w-5 shrink-0 touch-none items-center justify-center text-muted-foreground"
          data-drag-handle
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </span>
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
            aria-expanded={open}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            onClick={() => onToggle(node.id)}
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <TreeDisclosure expandable={false} />
        )}
        <IconPicker value={icon} onChange={(next) => onChange(updateNode(all, node.id, { icon: next }))} />
        {renaming ? (
          // ui-exception: a menu row's name is a short raw label, not prose
          <Field
            autoFocus
            value={draft}
            aria-label="Name"
            placeholder={node.kind === "nav" ? (getCatalogEntry(node.ref, { isAdmin: true })?.label ?? "") : ""}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="min-w-0 flex-1"
          />
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left type-body"
            title="Rename"
            onDoubleClick={() => {
              setDraft(node.kind === "nav" ? (node.label ?? "") : node.label);
              setRenaming(true);
            }}
          >
            {label}
          </button>
        )}
        {hasChildren && !open ? <span className="type-body shrink-0 text-muted-foreground">{children?.length}</span> : null}
        {kindWord ? <span className="type-body shrink-0 text-muted-foreground">{kindWord}</span> : null}
        {custom ? <span className="type-body shrink-0 text-muted-foreground">Renamed</span> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="quiet" aria-label={`Options for ${label}`} icon={<MoreHorizontal />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setDraft(node.kind === "nav" ? (node.label ?? "") : node.label);
                setRenaming(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange(nudgeNode(all, node.id, -1, region))}>
              <ArrowUp className="mr-2 h-4 w-4" /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChange(nudgeNode(all, node.id, 1, region))}>
              <ArrowDown className="mr-2 h-4 w-4" /> Move down
            </DropdownMenuItem>
            {region === "sidebar" && depth > 1 ? (
              <DropdownMenuItem onClick={() => onChange(moveNode(all, node.id, { kind: "top" }, region) ?? all)}>
                <ArrowUpToLine className="mr-2 h-4 w-4" /> Move to top level
              </DropdownMenuItem>
            ) : null}
            {into.length > 0 ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="mr-2 h-4 w-4" /> Move into
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                  {into.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => onChange(moveNode(all, node.id, { kind: "inside", id: c.id }, region) ?? all)}>
                      <span style={{ paddingLeft: (c.depth - 1) * TREE_INDENT_PX }}>{c.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange(removeNode(all, node.id))}>
              <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children && hasChildren && open ? (
        <ul>
          {children.map((child) => (
            <Row key={child.id} node={child} depth={depth + 1} all={all} region={region} target={target} dragging={dragging} onChange={onChange} openIds={openIds} onToggle={onToggle} />
          ))}
        </ul>
      ) : null}
      {node.kind === "group" && children?.length === 0 ? (
        <p className="type-body flex items-center gap-1 py-1 text-muted-foreground" style={treeIndentStyle(depth)}>
          <span aria-hidden="true" className="w-5 shrink-0" />
          <TreeDisclosure expandable={false} />
          Drop rows here
        </p>
      ) : null}
    </li>
  );
}
