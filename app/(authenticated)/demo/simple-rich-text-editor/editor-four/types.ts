// React event types for component props
export interface EditorRef {
    current: HTMLDivElement | null;
  }
  
  export interface ChipData {
    id: string;
    label: string;
  }
  
  export interface EditorState {
    chipCounter: number;
    draggedChip: HTMLElement | null;
    plainTextContent: string;
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
  
  export interface EditorHookResult extends EditorState, ReactEventHandlers, DOMEventHandlers {
    insertChip: () => void;
    updatePlainTextContent: () => void;
    normalizeContent: () => void;
  }  
