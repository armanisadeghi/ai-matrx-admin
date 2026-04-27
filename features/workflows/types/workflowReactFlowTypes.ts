import type { CSSProperties } from "react";
import type { CoordinateExtent, Position, XYPosition } from "reactflow";

/** Broke out of index to avoid types/* importing the barrel (circular graph). */
export type PythonDataType =
  | "int"
  | "float"
  | "str"
  | "bool"
  | "list"
  | "tuple"
  | "dict"
  | "set";

export interface ReactFlowUIMetadata {
  position: XYPosition;
  type?: string;
  sourcePosition?: Position;
  targetPosition?: Position;
  hidden?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  dragHandle?: string;
  parentId?: string;
  zIndex?: number;
  extent?: "parent" | CoordinateExtent;
  expandParent?: boolean;
  ariaLabel?: string;
  focusable?: boolean;
  style?: CSSProperties;
  className?: string;
}
