
/**
 * Wraps all direct text nodes of a container element in span elements.
 * Used primarily in rich text editor contexts to ensure consistent text node structure.
 * 
 * @param container - The container element (usually the editor root element)
 * @returns void
 */
export function normalizeEditorContent(container: HTMLElement): void {
    if (!container) return;
    
    console.log('Normalizing content');
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);

    let node;
    while ((node = walker.nextNode())) {
        if (node.parentNode === container) {
            const span = document.createElement('span');
            node.parentNode.insertBefore(span, node);
            span.appendChild(node);
        }
    }
}