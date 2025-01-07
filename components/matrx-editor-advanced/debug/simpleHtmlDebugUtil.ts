export const inspectEditorHTML = (editor: HTMLDivElement) => {
    // Get current HTML
    const currentHTML = editor.innerHTML;
    
    // Create cleaned version by:
    // 1. Remove empty spans
    // 2. Consolidate nested spans
    // 3. Fix malformed structures
    const cleanHTML = currentHTML
        .replace(/<span>\s*<\/span>/g, '') // Remove empty spans
        .replace(/<span><span>/g, '<span>') // Consolidate nested spans
        .replace(/<\/span><\/span>/g, '</span>') // Fix closing tags
        .replace(/(&nbsp;){2,}/g, '&nbsp;') // Consolidate multiple spaces
        .replace(/<div>\s*<br\s*\/?>\s*<\/div>/g, '<div><br /></div>') // Normalize empty lines
        .replace(/<span>(\s*)<\/span>/g, '$1'); // Remove spans around whitespace

    return {
        original: currentHTML,
        cleaned: cleanHTML,
        diffSummary: {
            originalLength: currentHTML.length,
            cleanedLength: cleanHTML.length,
            nestedSpans: (currentHTML.match(/<span><span>/g) || []).length,
            emptySpans: (currentHTML.match(/<span>\s*<\/span>/g) || []).length
        }
    };
};

export const debugEditorState = (editor: HTMLDivElement) => {
    const state = inspectEditorHTML(editor);
    console.log('Editor HTML Analysis:', {
        currentLength: state.original.length,
        cleanedLength: state.cleaned.length,
        nestedSpans: state.diffSummary.nestedSpans,
        emptySpans: state.diffSummary.emptySpans
    });
    return state;
};