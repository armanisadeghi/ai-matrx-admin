import React, { useRef, useEffect, useState } from 'react';

const RichTextEditor = () => {
    const editorRef = useRef(null);
    const [content, setContent] = useState('');
    const [draggedChip, setDraggedChip] = useState(null);

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

    const insertChip = (chipData) => {
        // Create the structure
        const leadingSpace = document.createTextNode('\u00A0');

        const chipWrapper = document.createElement('span');
        chipWrapper.className = 'chip-wrapper';

        const chip = document.createElement('span');
        chip.contentEditable = 'false';
        chip.className = 'inline-flex items-center px-2 py-1 mx-1 bg-blue-100 rounded-md cursor-move';
        chip.setAttribute('data-chip', 'true');
        chip.setAttribute('data-chip-id', chipData.id);
        chip.setAttribute('draggable', 'true');
        chip.textContent = chipData.label;

        // Add drag event listeners
        chip.addEventListener('dragstart', handleDragStart);
        chip.addEventListener('dragend', handleDragEnd);

        const trailingSpace = document.createTextNode('\u00A0');

        // Get current selection and prepare for insertion
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        // Extract the container where we're inserting
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }

        // Create a new text span if we're directly in the editor
        if (container === editorRef.current) {
            const span = document.createElement('span');
            range.surroundContents(span);
            container = span;
        }

        // Insert all elements at the correct level
        const insertPosition = range.endContainer;
        const parent = insertPosition.parentNode;

        // Split text node if necessary
        if (insertPosition.nodeType === Node.TEXT_NODE) {
            const textNode = insertPosition as Text; // Type assertion to Text
            const afterText = textNode.splitText(range.endOffset);
            parent.insertBefore(leadingSpace, afterText);
            parent.insertBefore(chipWrapper, afterText);
            chipWrapper.appendChild(chip);
            parent.insertBefore(trailingSpace, afterText);
        } else {
            parent.insertBefore(leadingSpace, insertPosition.nextSibling);
            parent.insertBefore(chipWrapper, insertPosition.nextSibling);
            chipWrapper.appendChild(chip);
            parent.insertBefore(trailingSpace, insertPosition.nextSibling);
        }

        // Move cursor after the trailing space
        const newRange = document.createRange();
        newRange.setStartAfter(trailingSpace);
        newRange.setEndAfter(trailingSpace);
        selection.removeAllRanges();
        selection.addRange(newRange);
    };

    const handleDragStart = (e) => {
        const chip = e.target;
        setDraggedChip(chip);

        // Set drag image and data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', chip.textContent);

        // Add visual feedback
        chip.classList.add('opacity-50');

        // Prevent editor from losing focus
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

        // Remove existing drop indicator
        const oldIndicator = editor.querySelector('.drop-indicator');
        if (oldIndicator) oldIndicator.remove();

        if (range) {
            // Create and insert drop indicator
            const indicator = document.createElement('span');
            indicator.className = 'drop-indicator inline-block w-0.5 h-4 bg-blue-500 mx-0.5';
            range.insertNode(indicator);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (!draggedChip) return;

        const range = getDropRange(e.clientX, e.clientY);
        if (!range) return;

        // Remove drop indicator
        const indicator = editorRef.current.querySelector('.drop-indicator');
        if (indicator) indicator.remove();

        // Move the chip wrapper (includes trailing space)
        const chipWrapper = draggedChip.parentNode;
        range.insertNode(chipWrapper);

        // Restore cursor position
        const newRange = document.createRange();
        newRange.setStartAfter(chipWrapper);
        newRange.collapse(true);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(newRange);

        normalizeContent();
    };

    const getDropRange = (x, y) => {
        // Get the position for inserting the dragged chip
        const editor = editorRef.current;
        if (!editor) return null;

        const range = document.caretRangeFromPoint(x, y);
        if (!range || !editor.contains(range.commonAncestorContainer)) return null;

        return range;
    };

    const normalizeContent = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);

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
        <div className='w-full max-w-4xl border border-gray-300 rounded-lg'>
            <div
                ref={editorRef}
                className='min-h-48 p-4 focus:outline-none'
                contentEditable
                onInput={(e) => {
                    setContent(e.currentTarget.textContent);
                    normalizeContent();
                }}
                onBlur={normalizeContent}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            />

            <button
                className='px-4 py-2 bg-blue-500 text-white rounded'
                onClick={() => insertChip({ id: Date.now(), label: '@mention' })}
            >
                Insert Mention
            </button>
        </div>
    );
};

export default RichTextEditor;
