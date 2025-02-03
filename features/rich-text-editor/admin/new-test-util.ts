export type EditorLineInfo = {
    currentRange: Range | null;
    selectedText: string | null;
    isInsideEditor: boolean;
    totalLines: number;
    currentLine: number;
    beforeText: string;
    afterText: string;
    cursorPosition: number | null;
 };
 
 /**
 * Gets cursor position in editor
 */
 export const getEditorCursorPosition = (editorId: string): number | null => {
    const editor = document.querySelector(`[data-editor-id="${editorId}"]`);
    if (!editor) return null;
 
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
 
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
 
    return range.startOffset;
 };
 
 /**
 * Counts total lines in editor
 */
 export const getEditorTotalLines = (editorId: string): number => {
    const editor = document.querySelector(`[data-editor-id="${editorId}"]`);
    if (!editor) return 0;
 
    const firstSpan = editor.querySelector(':scope > span');
    const divs = editor.querySelectorAll(':scope > div');
    
    return (firstSpan ? 1 : 0) + divs.length;
 };
 
 /**
 * Gets selection and range info
 */
 export const getEditorSelectionInfo = (editorId: string) => {
    const editor = document.querySelector(`[data-editor-id="${editorId}"]`);
    if (!editor) {
        return {
            range: null,
            selectedText: 'ERROR',
            isInsideEditor: false
        };
    }

    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const selectedText = selection?.toString() ? `|${selection.toString()}|` : null;
    const isInsideEditor = range ? editor.contains(range.commonAncestorContainer) : false;

    return {
        range,
        selectedText, 
        isInsideEditor
    };
};

/**
 * Gets the current line number
 */
 export const getCurrentLine = (editorId: string): number => {
    const editor = document.querySelector(`[data-editor-id="${editorId}"]`);
    if (!editor) return 0;
 
    const selection = window.getSelection();
    if (!selection?.rangeCount) return 0;
    
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    
    // Check if in first span
    const firstSpan = editor.querySelector(':scope > span');
    if (firstSpan?.contains(node)) return 1;
 
    // Otherwise count divs until current position
    const divs = Array.from(editor.querySelectorAll(':scope > div'));
    let currentNode: Node | null = node;
    
    while (currentNode && currentNode !== editor) {
        if (currentNode.parentElement === editor && currentNode.nodeName === 'DIV') {
            return divs.indexOf(currentNode as Element) + 2; // +2 for 1-based and accounting for first span
        }
        currentNode = currentNode.parentElement;
    }
 
    return 0;
 };
 
 /**
 * Gets before/after text of current line
 */
 type LineTextResult = {
    beforeText: string;
    afterText: string;
};

/**
 * Gets before/after text of current line - one word each direction, preserving spaces
 */
export const getLineText = (editorId: string): LineTextResult => {
    const editor = document.querySelector(`[data-editor-id="${editorId}"]`);
    if (!editor) return { beforeText: 'ERROR', afterText: 'ERROR' };

    const selection = window.getSelection();
    if (!selection?.rangeCount) return { beforeText: 'ERROR', afterText: 'ERROR' };

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return { beforeText: 'ERROR', afterText: 'ERROR' };

    // Find current line element, handling both span and div cases
    let lineElement: Element | null = null;
    const currentNode = range.startContainer;
    
    // First, try to find if we're in the first line (span)
    const firstSpan = editor.querySelector(':scope > span');
    if (firstSpan?.contains(currentNode)) {
        lineElement = firstSpan;
    } else {
        // If not in first span, look for containing div
        let currentElement = currentNode.nodeType === Node.TEXT_NODE ? 
            currentNode.parentElement : 
            currentNode as Element;
        
        while (currentElement && currentElement.parentElement !== editor) {
            currentElement = currentElement.parentElement!;
        }
        
        if (currentElement?.tagName === 'DIV') {
            lineElement = currentElement;
        }
    }

    if (!lineElement) return { beforeText: 'ERROR', afterText: 'ERROR' };

    // Handle empty lines (just <br>)
    if (lineElement.innerHTML === '<br>') {
        return {
            beforeText: '|***|',
            afterText: '|***|'
        };
    }

    const text = lineElement.textContent || '';
    const cursorPosition = range.startOffset;

    // If we're at the very start of the line
    if (cursorPosition === 0) {
        const firstWord = text.match(/^\s*(\S+\s*)/);
        return {
            beforeText: '|***|',
            afterText: firstWord ? `|${firstWord[1]}|` : '|***|'
        };
    }

    // If we're at the very end of the line
    if (cursorPosition === text.length) {
        const lastWord = text.match(/(\s*\S+\s*)$/);
        return {
            beforeText: lastWord ? `|${lastWord[1]}|` : '|***|',
            afterText: '|***|'
        };
    }

    // Get the text before and after cursor
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);

    // Get the nearest word before cursor (including trailing spaces)
    const beforeMatch = beforeCursor.match(/(\S+\s*)$/);
    const beforeWord = beforeMatch ? beforeMatch[1] : '***';

    // Get the nearest word after cursor (including leading spaces)
    const afterMatch = afterCursor.match(/^(\s*\S+)/);
    const afterWord = afterMatch ? afterMatch[1] : '***';

    return {
        beforeText: `|${beforeWord}|`,
        afterText: `|${afterWord}|`
    };
};
 /**
 * Main function that combines all info
 */
 export const getEditorLineInfo = (editorId: string): EditorLineInfo => {
    const selectionInfo = getEditorSelectionInfo(editorId);
    const totalLines = getEditorTotalLines(editorId);
    const currentLine = getCurrentLine(editorId);
    const { beforeText, afterText } = getLineText(editorId);
    const cursorPosition = getEditorCursorPosition(editorId);
 
    return {
        currentRange: selectionInfo.range,
        selectedText: selectionInfo.selectedText,
        isInsideEditor: selectionInfo.isInsideEditor,
        totalLines,
        currentLine,
        beforeText,
        afterText,
        cursorPosition
    };
 };