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

export const createChipElement = (chipId: string): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.className =
        'inline-flex items-center px-2 py-1 mx-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md cursor-move hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200';
    chip.setAttribute('data-chip', 'true');
    chip.setAttribute('data-chip-id', chipId);
    chip.setAttribute('draggable', 'true');
    chip.textContent = chipId;
    return chip;
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
