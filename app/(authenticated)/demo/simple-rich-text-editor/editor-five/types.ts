import { MatrxRecordId } from "@/types";

// types.ts
export interface EditorRef {
  current: HTMLDivElement | null;
}

export interface ChipRequestOptions {
  id?: string;
  label?: string;
  stringValue?: string;
  color?: string;
  brokerId?: MatrxRecordId;
}

export interface ChipData {
  id: string;
  label: string;
  color?: string;
  stringValue?: string;
  brokerId?: MatrxRecordId;
}

export interface EditorState {
  chipCounter: number;
  draggedChip: HTMLElement | null;
  plainTextContent: string;
  chipData: ChipData[];
  colorAssignments: Map<string, string>;
}

// Split event handler types between native DOM and React events
export interface DOMEventHandlers {
  handleNativeDragStart: (e: DragEvent) => void;
  handleNativeDragEnd: (e: DragEvent) => void;
}

export interface ReactEventHandlers {
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
}

export interface TextStyle {
  command: string;
  value?: string | null;
}

// Add RefMethods interface for Ref Manager integration
export interface EditorRefMethods {
  insertChip: () => void;
  convertSelectionToChip: () => boolean;
  applyStyle: (style: TextStyle) => void;
  getText: () => string;
  normalize: () => void;
  updateContent: () => void;
  removeChipData: (id: string) => void;
  updatePlainTextContent: () => void;
  focus: () => void;
}

export interface EditorInternalMethods {
  updatePlainTextContent: () => void;
  normalizeContent: () => void;
  handleStyleChange: (style: TextStyle) => void;
}

// Update EditorHookResult to include all methods
export interface EditorHookResult extends 
  EditorState, 
  ReactEventHandlers, 
  DOMEventHandlers, 
  EditorRefMethods,
  EditorInternalMethods {}

export interface ToolbarProps {
  onApplyStyle: (style: TextStyle) => void;
  onInsertChip: () => void;
}

export interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  className?: string;
}

export interface ColorOption {
  label: string;
  value: string;
}

export interface FontSizeOption {
  label: string;
  value: string;
}

export interface ToolbarConfig {
  colors: {
      text: ColorOption[];
      background: ColorOption[];
  };
  fontSizes: FontSizeOption[];
}

// Update ToolbarProps
export interface ToolbarProps {
  onApplyStyle: (style: TextStyle) => void;
  onInsertChip: () => void;
  onConvertToChip?: () => void; // New prop for future feature
}
