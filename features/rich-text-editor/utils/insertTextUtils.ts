// Utility functions for inserting text at cursor position

/**
 * Inserts text at the current cursor position in the editor
 * @param editorId - The ID of the editor element
 * @param text - The text to insert
 * @returns boolean - Success status
 */
export const insertTextAtCursor = (editorId: string, text: string): boolean => {
    try {
        const editor = document.querySelector(`[data-editor-id="${editorId}"]`) as HTMLDivElement | null;
        if (!editor) {
            console.error('Editor not found');
            return false;
        }

        // Ensure editor has focus
        editor.focus();

        const selection = window.getSelection();
        if (!selection) {
            console.error('Selection not available');
            return false;
        }

        let range: Range;
        
        // Get or create a range
        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        } else {
            // Create a new range at the end of the editor
            range = document.createRange();
            const lastNode = editor.lastChild;
            if (lastNode) {
                if (lastNode.nodeType === Node.TEXT_NODE) {
                    range.setStart(lastNode, lastNode.textContent?.length || 0);
                } else {
                    range.setStartAfter(lastNode);
                }
            } else {
                range.setStart(editor, 0);
            }
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // Delete any selected content first
        if (!range.collapsed) {
            range.deleteContents();
        }

        // Create a text node with the content
        const textNode = document.createTextNode(text);
        
        // Insert the text node
        range.insertNode(textNode);
        
        // Move cursor to the end of inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        // Ensure cursor is visible
        editor.focus();

        return true;
    } catch (error) {
        console.error('Error inserting text:', error);
        return false;
    }
};

/**
 * Gets the current cursor position info
 * @param editorId - The ID of the editor element
 * @returns Object with cursor position information
 */
export const getCursorPosition = (editorId: string) => {
    const editor = document.querySelector(`[data-editor-id="${editorId}"]`) as HTMLDivElement | null;
    if (!editor) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const isWithinEditor = editor.contains(range.commonAncestorContainer);

    return {
        isWithinEditor,
        range,
        hasSelection: !range.collapsed,
        selectedText: range.toString(),
    };
};

/**
 * Saves the current cursor position
 * @returns Saved range or null
 */
export const saveCursorPosition = (): Range | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return selection.getRangeAt(0).cloneRange();
};

/**
 * Restores a previously saved cursor position
 * @param range - The saved range to restore
 */
export const restoreCursorPosition = (range: Range): void => {
    const selection = window.getSelection();
    if (!selection) return;
    
    selection.removeAllRanges();
    selection.addRange(range);
};

