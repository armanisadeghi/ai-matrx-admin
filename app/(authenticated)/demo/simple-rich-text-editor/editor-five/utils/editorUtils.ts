import { ChipData, TextStyle } from '../types';
import { getColorClassName } from './colorUitls';
import { cn } from '@/lib/utils';

export const ensureValidContainer = (editor: HTMLDivElement, selection: Selection): Range => {
    if (!editor.firstChild) {
        const initialSpan = document.createElement('span');
        initialSpan.appendChild(document.createTextNode('\u200B'));
        editor.appendChild(initialSpan);

        const range = document.createRange();
        range.setStart(initialSpan.firstChild!, 0);
        range.setEnd(initialSpan.firstChild!, 0);
        selection.removeAllRanges();
        selection.addRange(range);
        return range;
    }

    let range: Range;
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


export const safeInsertBefore = (
    parent: Node | null | undefined,
    newNode: Node,
    referenceNode: Node | null | undefined
): void => {
    if (!parent) return;
    
    // If no reference node or it's not a child of parent, append to end
    if (!referenceNode || referenceNode.parentNode !== parent) {
        parent.appendChild(newNode);
        return;
    }
    
    parent.insertBefore(newNode, referenceNode);
};




export const getDropRange = (x: number, y: number, editor: HTMLDivElement): Range | null => {
    if (!editor) return null;

    const range = document.caretRangeFromPoint(x, y);
    if (!range || !editor.contains(range.commonAncestorContainer)) return null;

    return range;
};

export const isValidDropTarget = (node: Node, editorRef: HTMLDivElement): boolean => {
    let current: Node | null = node;
    while (current && current !== editorRef) {
        if (current instanceof Element && current.hasAttribute('data-chip-id')) {
            return false;
        }
        current = current.parentNode;
    }
    return true;
};

export const extractTextContent = (editor: HTMLDivElement): string => {
    let text = '';
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent === '\u200B') {
                    return NodeFilter.FILTER_SKIP;
                }
                if (node.parentNode instanceof Element && node.parentNode.hasAttribute('data-chip-id')) {
                    return NodeFilter.FILTER_SKIP;
                }
            }
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node instanceof Element) {
            if (node.hasAttribute('data-chip-id')) {
                text += `{${node.getAttribute('data-chip-id')}}!`;
            } else if (node.tagName === 'DIV') {
                if (node.querySelector('br')) {
                    text += '\n\n';
                } else {
                    text += '\n';
                }
            }
        }
    }

    return text
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .join('\n')
        .trim();
};

export const applyTextStyle = (style: TextStyle): void => {
    document.execCommand(style.command, false, style.value || null);
};

export const getFormattedContent = (editor: HTMLDivElement): string => {
    const clone = editor.cloneNode(true) as HTMLDivElement;
    const chips = clone.querySelectorAll('[data-chip="true"]');

    chips.forEach((chip) => {
        const chipName = chip.textContent;
        chip.replaceWith(`{${chipName}}!`);
    });

    return clone.textContent || '';
};

export const getSelectedText = (): { text: string; range: Range | null } => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return { text: '', range: null };
    }

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();

    return { text, range };
};

export const isValidChipText = (text: string): boolean => {
    return text.length > 0 && text.length <= 1000;
};
