import React, { useRef, useEffect, useState } from 'react';

const RichTextEditor = () => {
  const editorRef = useRef(null);
  const [chipCounter, setChipCounter] = useState(1);
  const [draggedChip, setDraggedChip] = useState(null);
  const [plainTextContent, setPlainTextContent] = useState('');

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('spellcheck', 'true');
    
    editor.addEventListener('paste', handlePaste);
    
    return () => {
      editor.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const ensureValidContainer = (editor, selection) => {
    if (!editor.firstChild) {
      const initialSpan = document.createElement('span');
      initialSpan.appendChild(document.createTextNode('\u200B'));
      editor.appendChild(initialSpan);
      
      const range = document.createRange();
      range.setStart(initialSpan.firstChild, 0);
      range.setEnd(initialSpan.firstChild, 0);
      selection.removeAllRanges();
      selection.addRange(range);
      return range;
    }
    
    let range;
    try {
      range = selection.getRangeAt(0);
    } catch {
      range = document.createRange();
      range.setStart(editor.firstChild.firstChild || editor.firstChild, 0);
      range.setEnd(editor.firstChild.firstChild || editor.firstChild, 0);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    return range;
  };

  const insertChip = () => {
    const chipId = `new-chip-${chipCounter}`;
    const editor = editorRef.current;
    const selection = window.getSelection();
    
    if (!editor || !selection) return;

    const currentRange = ensureValidContainer(editor, selection);
    
    const chipWrapper = document.createElement('span');
    chipWrapper.className = 'chip-wrapper';
    
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.className = 'inline-flex items-center px-2 py-1 mx-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md cursor-move hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200';
    chip.setAttribute('data-chip', 'true');
    chip.setAttribute('data-chip-id', chipId);
    chip.setAttribute('draggable', 'true');
    chip.textContent = chipId;
    
    chip.addEventListener('dragstart', handleDragStart);
    chip.addEventListener('dragend', handleDragEnd);

    const leadingSpace = document.createTextNode('\u00A0');
    const trailingSpace = document.createTextNode('\u00A0');
    const anchorNode = document.createTextNode('\u200B');

    let container = currentRange.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }

    if (container === editor) {
      const span = document.createElement('span');
      span.appendChild(document.createTextNode('\u200B'));
      
      if (currentRange.startContainer === editor) {
        editor.insertBefore(span, editor.firstChild);
      } else {
        editor.appendChild(span);
      }
      
      container = span;
      currentRange.selectNode(span);
    }

    const parent = currentRange.endContainer.parentNode;
    const insertionWrapper = document.createElement('span');
    insertionWrapper.appendChild(leadingSpace);
    insertionWrapper.appendChild(chipWrapper);
    chipWrapper.appendChild(chip);
    insertionWrapper.appendChild(trailingSpace);
    insertionWrapper.appendChild(anchorNode);

    if (currentRange.collapsed) {
      const insertPosition = currentRange.startContainer;
      if (insertPosition.nodeType === Node.TEXT_NODE) {
        const textNode = insertPosition;
        const afterText = textNode.splitText(currentRange.startOffset);
        parent.insertBefore(insertionWrapper, afterText.parentNode.nextSibling);
      } else {
        parent.insertBefore(insertionWrapper, container.nextSibling);
      }
    } else {
      currentRange.deleteContents();
      currentRange.insertNode(insertionWrapper);
    }

    const finalRange = document.createRange();
    finalRange.setStart(anchorNode, 0);
    finalRange.setEnd(anchorNode, 0);
    selection.removeAllRanges();
    selection.addRange(finalRange);

    setChipCounter(prev => prev + 1);
    updatePlainTextContent();
  };

  const updatePlainTextContent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    let text = '';
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent === '\u200B') {
              return NodeFilter.FILTER_SKIP;
            }
            if (node.parentNode instanceof Element && 
                node.parentNode.hasAttribute('data-chip-id')) {
              return NodeFilter.FILTER_SKIP;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node instanceof Element) {
        if (node.hasAttribute('data-chip-id')) {
          text += `{${node.getAttribute('data-chip-id')}}!`;
        } else if (node.tagName === 'DIV') {
          // Handle line breaks
          if (node.querySelector('br')) {
            text += '\n\n'; // Empty line (div with br)
          } else {
            text += '\n'; // Regular line break (div)
          }
        }
      }
    }

    // Clean up while preserving intended line breaks
    text = text
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .join('\n')
      .trim();

    setPlainTextContent(text);
  };

  const handleDragStart = (e) => {
    const chip = e.target;
    setDraggedChip(chip);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', chip.textContent);
    chip.classList.add('opacity-50');
    e.stopPropagation();
  };

  const handleDragEnd = (e) => {
    const chip = e.target;
    chip.classList.remove('opacity-50');
    setDraggedChip(null);
  };

  const handleDragOver = (e) => {
    if (!draggedChip) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const editor = editorRef.current;
    const range = getDropRange(e.clientX, e.clientY);
    
    const oldIndicator = editor.querySelector('.drop-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    if (range && isValidDropTarget(range.commonAncestorContainer)) {
      const indicator = document.createElement('span');
      indicator.className = 'drop-indicator inline-block w-0.5 h-4 bg-blue-500 mx-0.5';
      range.insertNode(indicator);
    }
  };

  const isValidDropTarget = (node) => {
    // Check if the node or its ancestors are a chip
    let current = node;
    while (current && current !== editorRef.current) {
      if (current.hasAttribute && current.hasAttribute('data-chip-id')) {
        return false;
      }
      current = current.parentNode;
    }
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedChip) return;

    const range = getDropRange(e.clientX, e.clientY);
    if (!range || !isValidDropTarget(range.commonAncestorContainer)) return;

    const indicator = editorRef.current.querySelector('.drop-indicator');
    if (indicator) indicator.remove();

    const chipWrapper = draggedChip.parentNode;
    range.insertNode(chipWrapper);

    const newRange = document.createRange();
    newRange.setStartAfter(chipWrapper);
    newRange.collapse(true);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);

    normalizeContent();
    updatePlainTextContent();
  };

  const getDropRange = (x, y) => {
    const editor = editorRef.current;
    if (!editor) return null;

    const range = document.caretRangeFromPoint(x, y);
    if (!range || !editor.contains(range.commonAncestorContainer)) return null;

    return range;
  };

  const normalizeContent = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.parentNode === editor) {
        const span = document.createElement('span');
        node.parentNode.insertBefore(span, node);
        span.appendChild(node);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg">
        <div
          ref={editorRef}
          className="min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap"
          contentEditable
          onInput={updatePlainTextContent}
          onBlur={normalizeContent}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        
        <div className="p-2 border-t border-gray-300 dark:border-gray-700">
          <button
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors duration-200"
            onClick={insertChip}
          >
            Insert Chip
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Text Representation
        </label>
        <textarea
          className="w-full h-24 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={plainTextContent}
          readOnly
        />
      </div>
    </div>
  );
};

export default RichTextEditor;