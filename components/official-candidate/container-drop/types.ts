import type React from "react";

// ---------------------------------------------------------------------------
// Data types — extend ContainerDropItem with any extra fields via intersection
// ---------------------------------------------------------------------------

export interface ContainerDropItem {
  id: string;
  label: string;
  [key: string]: unknown;
}

export interface ContainerDef {
  id: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Drag state exposed to consumers (read-only snapshot)
// ---------------------------------------------------------------------------

export interface DragSnapshot {
  itemId: string;
  originContainer: string | null;
  currentPos: { x: number; y: number };
  startRect: DOMRect;
}

// ---------------------------------------------------------------------------
// CRUD callbacks — each maps to a database operation in real usage
// ---------------------------------------------------------------------------

export interface ContainerDropCallbacks {
  /** Fired when an item is assigned to a container (CREATE junction / UPDATE FK) */
  onAssign?: (itemId: string, containerId: string) => void;
  /** Fired when an item is removed from a container (DELETE junction / SET FK null) */
  onUnassign?: (itemId: string, fromContainerId: string) => void;
  /** Fired on any assignment change with full from/to context */
  onMove?: (itemId: string, from: string | null, to: string | null) => void;
  /** Fired when a new item is added to the system */
  onAdd?: (item: ContainerDropItem) => void;
  /** Fired when an item is permanently removed */
  onRemove?: (itemId: string) => void;
}

// ---------------------------------------------------------------------------
// Hook configuration
// ---------------------------------------------------------------------------

export interface UseContainerDropConfig extends ContainerDropCallbacks {
  items: ContainerDropItem[];
  containers: ContainerDef[];
  /** Controlled mode: external assignments state */
  assignments?: Record<string, string | null>;
  /** Uncontrolled mode: initial assignments */
  defaultAssignments?: Record<string, string | null>;
  /** Controlled mode: callback when assignments change */
  onAssignmentsChange?: (assignments: Record<string, string | null>) => void;
}

// ---------------------------------------------------------------------------
// State + actions returned by the hook
// ---------------------------------------------------------------------------

export interface ContainerDropState {
  items: ContainerDropItem[];
  assignments: Record<string, string | null>;
  containers: ContainerDef[];
  dragSnapshot: DragSnapshot | null;
  hoverContainerId: string | null;
}

export interface ContainerDropActions {
  assign: (itemId: string, containerId: string | null) => void;
  addItem: (item: ContainerDropItem) => void;
  removeItem: (itemId: string) => void;
  getUnassigned: () => ContainerDropItem[];
  getContainerItems: (containerId: string) => ContainerDropItem[];
  getDraggingItem: () => ContainerDropItem | null;
  startDrag: (
    e: React.PointerEvent,
    item: ContainerDropItem,
    origin: string | null,
  ) => void;
  registerContainer: (id: string) => (el: HTMLDivElement | null) => void;
  isDragging: (itemId: string) => boolean;
}

export type ContainerDropValue = ContainerDropState & ContainerDropActions;
