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
        // Create initial container if editor is empty
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

        // Get current range or create one if none exists
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

        // Ensure we have a valid container and range
        const currentRange = ensureValidContainer(editor, selection);

        // Create chip elements
        const chipWrapper = document.createElement('span');
        chipWrapper.className = 'chip-wrapper';

        const chip = document.createElement('span');
        chip.contentEditable = 'false';
        chip.className = 'inline-flex items-center px-2 py-1 mx-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200';
        chip.setAttribute('data-chip', 'true');
        chip.setAttribute('data-chip-id', chipId);
        chip.setAttribute('draggable', 'true');
        chip.textContent = chipId;

        chip.addEventListener('dragstart', handleDragStart);
        chip.addEventListener('dragend', handleDragEnd);

        // Create spacing elements
        const leadingSpace = document.createTextNode('\u00A0');
        const trailingSpace = document.createTextNode('\u00A0');
        const anchorNode = document.createTextNode('\u200B');

        // Determine insertion point
        let container = currentRange.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode;
        }

        // Create a new container if needed
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

        // Insert elements
        const parent = currentRange.endContainer.parentNode;
        // Create a wrapper for the entire insertion
        const insertionWrapper = document.createElement('span');
        insertionWrapper.appendChild(leadingSpace);
        insertionWrapper.appendChild(chipWrapper);
        chipWrapper.appendChild(chip);
        insertionWrapper.appendChild(trailingSpace);
        insertionWrapper.appendChild(anchorNode);

        // Insert the wrapper
        if (currentRange.collapsed) {
            const insertPosition = currentRange.startContainer;
            if (insertPosition.nodeType === Node.TEXT_NODE) {
                const textNode = insertPosition as Text;

                const afterText = textNode.splitText(currentRange.startOffset);
                parent.insertBefore(insertionWrapper, afterText.parentNode.nextSibling);
            } else {
                parent.insertBefore(insertionWrapper, container.nextSibling);
            }
        } else {
            currentRange.deleteContents();
            currentRange.insertNode(insertionWrapper);
        }

        // Set cursor position after the chip
        const finalRange = document.createRange();
        finalRange.setStart(anchorNode, 0);
        finalRange.setEnd(anchorNode, 0);
        selection.removeAllRanges();
        selection.addRange(finalRange);

        setChipCounter((prev) => prev + 1);
        updatePlainTextContent();
    };

    const updatePlainTextContent = () => {
        const editor = editorRef.current;
        if (!editor) return;

        let text = '';
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    // Skip zero-width spaces
                    if (node.textContent === '\u200B') {
                        return NodeFilter.FILTER_SKIP;
                    }
                    // Skip chip content
                    if (node.parentNode instanceof Element && node.parentNode.hasAttribute('data-chip-id')) {
                        return NodeFilter.FILTER_SKIP;
                    }
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });

        let node;
        let lastWasNewline = false;

        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                const content = node.textContent;
                if (content === '\n') {
                    if (!lastWasNewline) {
                        text += '\n';
                        lastWasNewline = true;
                    }
                } else {
                    text += content;
                    lastWasNewline = false;
                }
            } else if (node instanceof Element && node.hasAttribute('data-chip-id')) {
                text += `{${node.getAttribute('data-chip-id')}}!`;
                lastWasNewline = false;
            }
        }

        // Clean up while preserving line breaks
        text = text
            .split('\n')
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .join('\n')
            .trim();

        setPlainTextContent(text);
    };

    // Previous drag and drop handlers remain the same
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

        if (range) {
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
        <div className='w-full max-w-4xl'>
            <div className='border border-gray-300 rounded-lg'>
                <div
                    ref={editorRef}
                    className='min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50'
                    contentEditable
                    onInput={updatePlainTextContent}
                    onBlur={normalizeContent}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />

                <div className='p-2 border-t border-gray-300'>
                    <button
                        className='px-4 py-2 bg-blue-500 text-white rounded'
                        onClick={insertChip}
                    >
                        Insert Chip
                    </button>
                </div>
            </div>

            <div className='mt-4'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2'>Text Representation</label>
                <textarea
                    className='w-full h-24 p-2 border border-gray-300 rounded-lg bg-background text-gray-900 dark:text-gray-100'
                    value={plainTextContent}
                    readOnly
                />
            </div>
        </div>
    );
};

export default RichTextEditor;
