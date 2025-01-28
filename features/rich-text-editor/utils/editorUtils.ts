import { BrokerMetaData, ChipData, ChipRequestOptions, TextStyle } from '../types/editor.types';


// Helper to get editor element by ID
export const getEditorElement = (editorId: string): HTMLDivElement | null => {
    return document.querySelector(`[data-editor-id="${editorId}"]`) as HTMLDivElement | null;
};


const formatChipMetadata = (element: Element): string => {
    const metadata: BrokerMetaData = {
        id: element.getAttribute('data-chip-id') || '',
        matrxRecordId: element.getAttribute('data-chip-matrxRecordId') || '',
        name: element.getAttribute('data-chip-name') || '',
        defaultValue: element.getAttribute('data-chip-defaultValue') || '',
        color: element.getAttribute('data-chip-color') || '',
        status: element.getAttribute('data-chip-status') || '',
        defaultComponent: element.getAttribute('data-chip-defaultComponent') || '',
        dataType: element.getAttribute('data-chip-dataType') || ''
    };

    // Build the metadata string in the required format
    const parts = [
        `matrxRecordId:${metadata.matrxRecordId}`,
        `id:${metadata.id}`,
        `name:"${metadata.name}"`,
        `defaultValue:"${metadata.defaultValue}"`,
        `color:"${metadata.color}"`,
        `status:"${metadata.status}"`
    ].filter(part => !part.endsWith('""') && !part.endsWith(':'));

    return `{${parts.join('|')}}!`;
};



export const extractEncodedTextFromDom = (editor: HTMLDivElement): string => {
    let text = '';
    
    // Handle deeply nested elements recursively if needed
    const processNestedElement = (element: Element): string => {
        if (element.hasAttribute('data-chip-id')) {
            return formatChipMetadata(element);
        }
        return '';
    };

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
                text += formatChipMetadata(node);
            } else if (node.tagName === 'DIV') {
                if (node.querySelector('br')) {
                    text += '\n\n';
                } else {
                    text += '\n';
                }
                // Process any nested elements that might be deeply buried
                const nestedText = processNestedElement(node);
                if (nestedText) {
                    text += nestedText;
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

        // If we're at the root editor level, we need to adjust the range
        if (range.startContainer.nodeType === Node.ELEMENT_NODE && (range.startContainer as Element).hasAttribute('data-editor-root')) {
            // Find the appropriate text node and adjust the range
            const firstSpan = editor.querySelector('span');
            if (firstSpan?.firstChild) {
                range = document.createRange();
                range.setStart(firstSpan.firstChild, firstSpan.firstChild.textContent?.length || 0);
                range.setEnd(firstSpan.firstChild, firstSpan.firstChild.textContent?.length || 0);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    } catch {
        range = document.createRange();
        range.setStart(editor.firstChild.firstChild || editor.firstChild, 0);
        range.setEnd(editor.firstChild.firstChild || editor.firstChild, 0);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    return range;
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


export const getSelectedTextOrRange = (editorId: string): { text: string; range: Range } => {
    const editor = getEditorElement(editorId);
    if (!editor) throw new Error('Editor not found');
    
    const selection = window.getSelection();
    if (!selection) throw new Error('Selection not available');
    
    const range = ensureValidContainer(editor, selection);
    const text = range.toString().trim();
    return { text, range };
};

export function insertWithRangeMethod(insertionWrapper: HTMLElement, range: Range) {
    range.deleteContents();
    range.insertNode(insertionWrapper);
}



export function insertWithStructurePreservation(insertionWrapper: HTMLElement, currentRange: Range, parent: Node | null | undefined, container: Node): boolean {
    try {
        // Store our conditions for clarity
        const isRangeCollapsed = currentRange.collapsed;
        const insertPosition = currentRange.startContainer;
        const isTextNode = insertPosition.nodeType === Node.TEXT_NODE;

        switch (true) {
            case isRangeCollapsed && isTextNode: {
                const textNode = insertPosition as Text;
                const afterText = textNode.splitText(currentRange.startOffset);
                parent?.insertBefore(insertionWrapper, afterText.parentNode?.nextSibling || null);
                break;
            }

            case isRangeCollapsed: {
                parent?.insertBefore(insertionWrapper, container.nextSibling);
                break;
            }

            default: {
                currentRange.deleteContents();
                currentRange.insertNode(insertionWrapper);
            }
        }

        return true;
    } catch (error) {
        return false;
    }
}


export function positionCursorAfterChip(anchorNode: Text, selection: Selection) {
    const finalRange = document.createRange();
    finalRange.setStart(anchorNode, 0);
    finalRange.setEnd(anchorNode, 0);
    selection.removeAllRanges();
    selection.addRange(finalRange);
}










const safeInsertBefore = (parent: Node | null | undefined, newNode: Node, referenceNode: Node | null | undefined): void => {
    if (!parent) return;

    // If no reference node or it's not a child of parent, append to end
    if (!referenceNode || referenceNode.parentNode !== parent) {
        parent.appendChild(newNode);
        return;
    }

    parent.insertBefore(newNode, referenceNode);
};



export const applyTextStyle = (style: TextStyle): void => {
    document.execCommand(style.command, false, style.value || null);
};


export const getCursorRange = (): Range | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0);
};

export const isValidChipText = (text: string): boolean => {
    return text.length > 0 && text.length <= 1000;
};




export const DEBUG_MODE = false;


export const setupEditorAttributes = (editor: HTMLDivElement, componentId: string) => {
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('spellcheck', 'true');
    editor.setAttribute('data-editor-root', 'true');
    editor.setAttribute('data-editor-id', componentId);
    // Explicitly mark as drop target
    editor.setAttribute('data-drop-target', 'true');
};

export const prepareChipRequestOptions = (existingChipData?: ChipData, selectedText?: string): ChipRequestOptions => {
    if (!existingChipData) {
        return selectedText ? { stringValue: selectedText } : {};
    }

    return {
        id: existingChipData.id,
        label: existingChipData.label,
        color: existingChipData.color,
        brokerId: existingChipData.brokerId,
        stringValue: existingChipData.stringValue,
    };
};
