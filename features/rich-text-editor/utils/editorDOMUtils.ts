// editorDOMUtils.ts
export const isWithinEditor = (node: Node | null, editorElement: HTMLDivElement | null): boolean => {
    if (!node || !editorElement) return false;
    
    let current = node;
    while (current && current !== document.body) {
        if (current === editorElement) {
            return true;
        }
        current = current.parentNode;
    }
    return false;
};

export const findAppropriateInsertionParent = (
    node: Node, 
    editorElement: HTMLDivElement
): { parent: Node; reference: Node | null } => {
    let current = node;

    // If we're in a text node, start with its parent
    if (current.nodeType === Node.TEXT_NODE) {
        current = current.parentNode;
    }

    // Special handling for divs - we want to insert inside them
    if (current.nodeName === 'DIV') {
        return {
            parent: current,
            reference: null
        };
    }

    // If we're in a span, go up to its parent, but stop at divs
    while (
        current.parentNode &&
        current.parentNode !== editorElement &&
        current.parentNode.nodeName !== 'DIV' &&
        (current.nodeName === 'SPAN' || 
         (current.parentNode as Element).classList?.contains('chip-wrapper'))
    ) {
        current = current.parentNode;
    }

    return {
        parent: current.parentNode,
        reference: current.nextSibling
    };
};


export const safeInsertBefore = (
    parent: Node | null | undefined,
    newNode: Node,
    referenceNode: Node | null | undefined
): void => {
    if (!parent) return;
    
    if (!referenceNode || referenceNode.parentNode !== parent) {
        parent.appendChild(newNode);
        return;
    }
    
    parent.insertBefore(newNode, referenceNode);
};

