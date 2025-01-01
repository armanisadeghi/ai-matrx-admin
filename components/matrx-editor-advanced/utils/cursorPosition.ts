// components\matrx-editor-advanced\utils\cursorPosition.ts

export const getCursorPosition = (element: HTMLElement): number => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return 0;

  let position = 0;
  const range = selection.getRangeAt(0);

  // Function to count positions from node content
  const countPositions = (node: Node) => {
    // Special handling for cursor in empty div
    if (
      node instanceof HTMLElement &&
      node.tagName === "DIV" &&
      node !== element &&
      node.childNodes.length === 1 &&
      node.firstChild instanceof HTMLBRElement &&
      node === range.endContainer
    ) {
      // If cursor is in this empty div
      position += 1; // For the line break
      return true;
    }

    if (node === range.endContainer && node.nodeType === Node.TEXT_NODE) {
      position += range.endOffset;
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent && node.textContent !== "\u200B") {
        position += node.textContent.length;
      }
    } else if (node instanceof HTMLElement) {
      // Handle line breaks
      if (node.tagName === "DIV" && node !== element) {
        position += 1; // Count the line break itself

        // If it's an empty line with just a <br>, count an additional position
        if (
          node.childNodes.length === 1 &&
          node.firstChild instanceof HTMLBRElement
        ) {
          position += 1;
        }
      }
      // Handle chips
      else if (node.hasAttribute("data-chip")) {
        position += 1;
      }
    }

    for (const child of Array.from(node.childNodes)) {
      if (countPositions(child)) return true;
    }

    return false;
  };

  countPositions(element);
  return position;
};

export const setCursorPosition = (element: HTMLElement, position: number) => {
  const range = document.createRange();
  const selection = window.getSelection();
  let currentPos = 0;
  let found = false;

  function traverseNodes(node: Node) {
    if (found) return;

    if (node instanceof HTMLElement && node !== element) {
      // Handle line breaks
      if (node.tagName === "DIV") {
        if (currentPos === position) {
          range.setStartBefore(node);
          range.collapse(true);
          found = true;
          return;
        }
        currentPos += 1; // Count the line break

        // If it's an empty line with just a <br>, count an additional position
        if (
          node.childNodes.length === 1 &&
          node.firstChild instanceof HTMLBRElement
        ) {
          if (currentPos === position) {
            range.setStartBefore(node.firstChild);
            range.collapse(true);
            found = true;
            return;
          }
          currentPos += 1;
        }
      }
      // Handle chips
      else if (node.hasAttribute("data-chip")) {
        if (currentPos === position) {
          range.setStartBefore(node);
          range.collapse(true);
          found = true;
          return;
        }
        currentPos += 1;
      }
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      if (node.textContent !== "\u200B") {
        const length = node.textContent.length;
        if (currentPos + length >= position) {
          range.setStart(node, position - currentPos);
          range.collapse(true);
          found = true;
          return;
        }
        currentPos += length;
      }
    }

    for (const child of Array.from(node.childNodes)) {
      traverseNodes(child);
    }
  }

  traverseNodes(element);

  if (selection && found) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
};
