// selectionUtils.ts
export interface SelectionState {
    hasSelection: boolean;
    selectedText: string;
    range: Range | null;
}

export const getEditorSelection = (editorElement: HTMLElement | null): SelectionState => {
    const defaultState = { hasSelection: false, selectedText: '', range: null };
    
    if (!editorElement) return defaultState;
    
    const selection = window.getSelection();
    if (!selection) return defaultState;
    
    // Check if selection is within editor
    if (!editorElement.contains(selection.anchorNode)) return defaultState;
    
    const selectedText = selection.toString();
    const hasSelection = selectedText.length > 0;
    
    return {
        hasSelection,
        selectedText,
        range: hasSelection ? selection.getRangeAt(0) : null
    };
};
