"use client";

export const createTextNode = (node: HTMLElement) => {
  if (!node.firstChild) {
    node.appendChild(document.createTextNode("hi"));
  }
};

export const setCursor = (node: HTMLElement, offset: number) => {
  const range = document.createRange();
  const selection = window.getSelection();

  if (!node.firstChild) {
    console.error("setCursor: node has no firstChild. Cannot set range.");
    return;
  }

  try {
    range.setStart(node.firstChild, offset);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    node.focus();
  } catch (err) {
    console.error("setCursor: Failed to set cursor. Error:", err);
  }
};

export const calculateCursorOffset = (
  e: React.MouseEvent<HTMLElement>,
  node: HTMLElement
) => {
  const relativeX = e.clientX - node.getBoundingClientRect().left;
  const totalWidth = node.getBoundingClientRect().width;

  // If node has no text, cursor stays at the beginning
  if (!node.textContent || node.textContent.length === 0) {
    console.warn(
      "calculateCursorOffset: Node has no text. Returning offset 0."
    );
    return 0;
  }

  // Handle clicks beyond the text
  if (relativeX >= totalWidth) {
    console.warn(
      "calculateCursorOffset: Click beyond last character. Defaulting to end."
    );
    return node.textContent.length; // Default to end of text
  }

  // Calculate average character width
  const charWidth = totalWidth / node.textContent.length;
  const offset = Math.floor((relativeX / charWidth) * 100);

  const boundedOffset = Math.min(Math.max(offset, 0), node.textContent.length);
  return boundedOffset;
};

export const normalizeText = (text: string) => {
    if (!text) return '';
    
    return text
      // Replace multiple newlines with double newline
      .replace(/(\r\n|\r|\n){2,}/g, '\n\n')
      // Replace non-breaking spaces with regular spaces
      .replace(/\u00A0/g, ' ')
      // Trim extra whitespace but preserve intentional newlines
      .trim();
  };
  

  export const getNextId = (content) => {  
    if (!content || !Array.isArray(content)) return 1;
  
    const maxId = Math.max(
      ...content
        .filter(item => item?.id) // Get any items with an id
        .map(item => parseInt(item.id))
        .filter(id => !isNaN(id)), // Filter out any non-numeric IDs
      0
    );
    const nextId = maxId + 1;
    console.log("-> calculateNextChipId nextId:", nextId);
    return nextId;
  };
  
  

  export const getSelectionRange = () => {
    console.log("getSelectionRange called");
    const selection = window.getSelection();
    console.log("--getSelectionRange selection:", selection);
  
    if (!selection?.rangeCount) return null;
  
    const range = selection.getRangeAt(0);
    console.log("-> getSelectionRange range:", range);
  
    return range;
  };
  