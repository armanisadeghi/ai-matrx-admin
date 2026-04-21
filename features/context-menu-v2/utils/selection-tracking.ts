export interface CapturedSelection {
  text: string;
  selection: Selection | null;
  range: Range | null;
}

export interface EditableSelectionRange {
  type: "editable";
  element: HTMLElement | null;
  start: number;
  end: number;
  range?: Range | null;
  containerElement?: HTMLElement | null;
}

export interface NonEditableSelectionRange {
  type: "non-editable";
  element: HTMLElement | null;
  start: number;
  end: number;
  range: Range | null;
  containerElement: HTMLElement | null;
}

export type SelectionRange = EditableSelectionRange | NonEditableSelectionRange;

export function captureTextareaSelection(
  target: HTMLTextAreaElement | HTMLInputElement,
): CapturedSelection {
  const start = target.selectionStart || 0;
  const end = target.selectionEnd || 0;
  const text = target.value.substring(start, end);
  return {
    text,
    selection: null,
    range: null,
  };
}

export function captureDomSelection(): CapturedSelection {
  const selection = window.getSelection();
  const text = selection?.toString() || "";
  let range: Range | null = null;
  if (selection && selection.rangeCount > 0) {
    try {
      range = selection.getRangeAt(0).cloneRange();
    } catch {
      range = null;
    }
  }
  return { text, selection, range };
}

export function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  try {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
    return null;
  } catch {
    return null;
  }
}

export function mouseFallbackRect(x: number, y: number): DOMRect {
  return {
    left: x - 50,
    right: x + 50,
    top: y - 10,
    bottom: y + 10,
    width: 100,
    height: 20,
    x: x - 50,
    y: y - 10,
    toJSON: () => ({}),
  } as DOMRect;
}

export function restoreTextareaSelection(
  element: HTMLTextAreaElement | HTMLInputElement,
  start: number,
  end: number,
  delayMs = 150,
): void {
  setTimeout(() => {
    element.focus();
    element.setSelectionRange(start, end);
  }, delayMs);
}

export function restoreDomSelection(range: Range, delayMs = 50): void {
  setTimeout(() => {
    try {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch {
      // selection restoration is best-effort
    }
  }, delayMs);
}
