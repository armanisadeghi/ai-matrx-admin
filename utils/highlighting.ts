// utils/highlighting.ts
export const highlightElements = (selectors: string[]) => {
    removeHighlights();

    document.querySelectorAll('.ai-help-highlight').forEach(el => {
        el.classList.remove('ai-help-highlight');
    });

    selectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.classList.add('ai-help-highlight');
            });
        } catch (error) {
            console.warn(`Failed to highlight element with selector: ${selector}`, error);
        }
    });
};

export const removeHighlights = () => {
    document.querySelectorAll('.ai-help-highlight').forEach(el => {
        el.classList.remove('ai-help-highlight');
    });
};
